/**
 * Enhanced multi-page website scraper for the Research Agent.
 * Fetches homepage + discovers and fetches pricing, features, about, integrations pages.
 * Returns structured data per raw_research.scrape schema.
 */

const TIMEOUT_MS = 20000;
const MAX_PAGES = 5;
const USER_AGENT = 'Mozilla/5.0 (compatible; FYI-GTM-Bot/1.0; +https://fyi.wtf)';

// Patterns to discover internal pages
const PAGE_PATTERNS = {
  pricing_page: /href=["']([^"']*(?:\/pricing|\/plans|\/packages)[^"']*)/i,
  features_page: /href=["']([^"']*(?:\/features|\/product|\/capabilities|\/platform)[^"']*)/i,
  about_page: /href=["']([^"']*(?:\/about|\/company|\/about-us|\/team)[^"']*)/i,
  integrations_page: /href=["']([^"']*(?:\/integrations|\/partners|\/ecosystem|\/marketplace)[^"']*)/i
};

/**
 * Scrape a tool's website — homepage + discovered subpages.
 *
 * @param {string} url - Tool's main URL
 * @returns {Promise<Object>} Structured scrape data matching raw_research.scrape schema
 */
async function scrapeWebsite(url) {
  const baseUrl = new URL(url);
  const result = {
    homepage: null,
    pricing_page: { raw_text: '', tiers_detected: [], found: false },
    features_page: { raw_text: '', feature_sections: [], found: false },
    about_page: { raw_text: '', team_info: '', found: false },
    integrations_page: { raw_text: '', integration_list: [], found: false }
  };

  // 1. Fetch and parse homepage
  const homepageHtml = await fetchPage(url);
  if (!homepageHtml) {
    result.homepage = { title: '', description: '', h1s: [], meta: {}, error: 'Failed to fetch' };
    return result;
  }

  result.homepage = extractHomepage(homepageHtml, url);

  // 2. Discover subpage URLs from homepage links
  const discovered = discoverPages(homepageHtml, baseUrl);

  // 3. Fetch each discovered page (parallel, with limit)
  const fetchPromises = [];
  for (const [pageType, pageUrl] of Object.entries(discovered)) {
    fetchPromises.push(
      fetchAndExtractPage(pageUrl, pageType).then(data => {
        if (data) result[pageType] = data;
      })
    );
  }
  await Promise.all(fetchPromises);

  return result;
}

/**
 * Fetch a single page with timeout.
 * @returns {Promise<string|null>} HTML content or null on failure
 */
async function fetchPage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml' },
      redirect: 'follow'
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Discover subpage URLs from homepage HTML.
 */
function discoverPages(html, baseUrl) {
  const found = {};
  for (const [pageType, pattern] of Object.entries(PAGE_PATTERNS)) {
    const match = html.match(pattern);
    if (match) {
      try {
        const resolved = new URL(match[1], baseUrl).href;
        // Only follow links on the same domain
        if (new URL(resolved).hostname === baseUrl.hostname) {
          found[pageType] = resolved;
        }
      } catch { /* invalid URL, skip */ }
    }
  }
  return found;
}

/**
 * Fetch a subpage and extract type-specific data.
 */
async function fetchAndExtractPage(url, pageType) {
  const html = await fetchPage(url);
  if (!html) return null;

  const cleanText = stripHtml(html);

  switch (pageType) {
    case 'pricing_page':
      return extractPricingPage(cleanText, html);
    case 'features_page':
      return extractFeaturesPage(cleanText, html);
    case 'about_page':
      return extractAboutPage(cleanText, html);
    case 'integrations_page':
      return extractIntegrationsPage(cleanText, html);
    default:
      return null;
  }
}

// --- Homepage extraction ---

function extractHomepage(html, url) {
  const domain = new URL(url).hostname.replace('www.', '');
  return {
    title: extractTag(html, 'title') || '',
    description: extractMeta(html, 'description') || extractMeta(html, 'og:description') || '',
    h1s: extractAllTags(html, 'h1'),
    meta: {
      og_title: extractMeta(html, 'og:title') || '',
      og_image: extractMeta(html, 'og:image') || '',
      site_name: extractMeta(html, 'og:site_name') || domain,
      logo: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    }
  };
}

// --- Subpage extractors ---

function extractPricingPage(text, html) {
  // Detect pricing tiers via common patterns
  const tiers = [];
  const tierPatterns = [
    /(?:^|\n)\s*(free|starter|basic|pro|professional|business|enterprise|team|growth|scale|plus|premium|standard|essentials?)\s*(?:\n|$)/gim,
  ];
  for (const p of tierPatterns) {
    let m;
    while ((m = p.exec(text)) !== null) {
      const name = m[1].trim();
      if (!tiers.includes(name.toLowerCase())) tiers.push(name);
    }
  }

  // Detect dollar amounts
  const prices = [];
  const pricePattern = /\$[\d,]+(?:\.\d{2})?(?:\s*\/\s*(?:mo(?:nth)?|yr|year|user|seat))?/gi;
  let pm;
  while ((pm = pricePattern.exec(text)) !== null) {
    if (!prices.includes(pm[0])) prices.push(pm[0]);
  }

  return {
    raw_text: text.slice(0, 3000),
    tiers_detected: tiers.slice(0, 10),
    prices_detected: prices.slice(0, 15),
    found: true
  };
}

function extractFeaturesPage(text, html) {
  // Extract H2/H3 headings as feature section names
  const sections = [
    ...extractAllTags(html, 'h2'),
    ...extractAllTags(html, 'h3')
  ].filter(h => h.length > 3 && h.length < 100);

  return {
    raw_text: text.slice(0, 3000),
    feature_sections: sections.slice(0, 20),
    found: true
  };
}

function extractAboutPage(text, html) {
  // Look for founding year
  const yearMatch = text.match(/(?:founded|established|started|since)\s+(?:in\s+)?(\d{4})/i);
  const teamInfo = [];

  // Look for team/leadership mentions
  const titlePatterns = /(?:CEO|CTO|Co-?founder|VP|Director|Head of)\s*[,:]\s*([A-Z][a-z]+ [A-Z][a-z]+)/g;
  let tm;
  while ((tm = titlePatterns.exec(text)) !== null) {
    teamInfo.push(tm[0]);
  }

  return {
    raw_text: text.slice(0, 3000),
    team_info: teamInfo.join('; ') || '',
    founded_year: yearMatch ? parseInt(yearMatch[1]) : null,
    found: true
  };
}

function extractIntegrationsPage(text, html) {
  // Common integration names to look for
  const knownIntegrations = [
    'salesforce', 'hubspot', 'slack', 'zapier', 'microsoft teams', 'zoom',
    'google workspace', 'gmail', 'outlook', 'linkedin', 'marketo', 'pardot',
    'segment', 'snowflake', 'bigquery', 'redshift', 'intercom', 'zendesk',
    'jira', 'asana', 'notion', 'airtable', 'stripe', 'shopify', 'gong',
    'outreach', 'salesloft', 'pipedrive', 'freshsales', 'dynamics 365',
    'workday', 'netsuite', 'sap', 'oracle', 'tableau', 'looker', 'power bi',
    'webhook', 'api', 'rest api', 'graphql', 'csv', 'excel'
  ];

  const lower = text.toLowerCase();
  const found = knownIntegrations.filter(name => lower.includes(name));

  return {
    raw_text: text.slice(0, 2000),
    integration_list: found,
    found: true
  };
}

// --- HTML utilities ---

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(html, tag) {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i'));
  return match ? decodeEntities(match[1].trim()) : null;
}

function extractAllTags(html, tag) {
  const results = [];
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'gi');
  let m;
  while ((m = regex.exec(html)) !== null) {
    const text = decodeEntities(m[1].trim());
    if (text) results.push(text);
  }
  return results;
}

function extractMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i')
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeEntities(match[1].trim());
  }
  return null;
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
}

module.exports = { scrapeWebsite };
