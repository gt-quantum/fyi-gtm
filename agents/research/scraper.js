/**
 * Enhanced multi-page website scraper for the Research Agent.
 *
 * Layered approach:
 * 1. Standard crawling: sitemap.xml, robots.txt, JSON-LD, RSS feeds
 * 2. Homepage + regex page discovery
 * 3. AI-assisted page classification (Haiku) for ambiguous URLs
 * 4. Wayback Machine / Google Cache fallback
 *
 * Returns structured data per raw_research.scrape schema.
 */

const TIMEOUT_MS = 20000;
const RETRY_DELAY_MS = 2000;
const MAX_RETRIES = 2;

// Realistic Chrome UA to avoid bot blocking
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const REALISTIC_HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
};

// Hardcoded regex patterns for page discovery (fallback)
const PAGE_PATTERNS = {
  pricing_page: /href=["']([^"']*(?:\/pricing|\/plans|\/packages|\/plans-and-pricing|\/price)[^"']*)/i,
  features_page: /href=["']([^"']*(?:\/features|\/product|\/capabilities|\/platform|\/solutions|\/how-it-works)[^"']*)/i,
  about_page: /href=["']([^"']*(?:\/about|\/company|\/about-us|\/team|\/our-story|\/who-we-are)[^"']*)/i,
  integrations_page: /href=["']([^"']*(?:\/integrations|\/partners|\/ecosystem|\/marketplace|\/apps|\/connections)[^"']*)/i,
  changelog_page: /href=["']([^"']*(?:\/changelog|\/releases|\/whats-new|\/updates|\/release-notes)[^"']*)/i,
  blog_page: /href=["']([^"']*(?:\/blog|\/news|\/articles|\/resources\/blog|\/journal)[^"']*)/i,
};

/**
 * Scrape a tool's website — homepage + standard sources + AI-discovered subpages.
 *
 * @param {string} url - Tool's main URL
 * @param {Object} options - { aiRouter, aiModel } for AI page discovery
 * @returns {Promise<Object>} Structured scrape data matching raw_research.scrape schema
 */
async function scrapeWebsite(url, options = {}) {
  const baseUrl = new URL(url);
  const result = {
    homepage: null,
    json_ld: [],
    sitemap_urls: [],
    rss_feed: null,
    pricing_page: { raw_text: '', tiers_detected: [], found: false },
    features_page: { raw_text: '', feature_sections: [], found: false },
    about_page: { raw_text: '', team_info: '', found: false },
    integrations_page: { raw_text: '', integration_list: [], found: false },
    changelog_page: { raw_text: '', entries: [], found: false },
    blog_page: { raw_text: '', posts: [], found: false },
  };

  // 1. Fetch homepage (with retry)
  const homepageHtml = await fetchPageWithRetry(url);
  if (!homepageHtml) {
    // Try Wayback Machine fallback
    const waybackHtml = await fetchWaybackMachine(url);
    if (waybackHtml) {
      result.homepage = extractHomepage(waybackHtml, url);
      result.homepage.source = 'wayback';
      result.json_ld = extractJsonLd(waybackHtml);
    } else {
      result.homepage = {
        title: '', description: '', h1s: [], meta: {},
        error: 'Failed to fetch',
        error_type: 'blocked'
      };
      return result;
    }
  } else {
    result.homepage = extractHomepage(homepageHtml, url);
    result.json_ld = extractJsonLd(homepageHtml);
  }

  const html = homepageHtml || '';

  // 2. Standard crawling sources (parallel)
  const [sitemapUrls, robotsTxt, rssFeed] = await Promise.all([
    fetchSitemap(baseUrl),
    fetchRobotsTxt(baseUrl),
    fetchRssFeed(baseUrl),
  ]);

  result.sitemap_urls = sitemapUrls;
  if (rssFeed) result.rss_feed = rssFeed;

  // 3. Discover pages — combine sitemap URLs + homepage links
  const homepageLinks = extractSameDomainLinks(html, baseUrl);
  const allUrls = [...new Set([...sitemapUrls, ...homepageLinks])];

  // 4. AI-assisted page classification (if AI router provided and we have URLs)
  let pageMap = {};
  if (options.aiRouter && allUrls.length > 0) {
    pageMap = await aiPageDiscovery(allUrls, baseUrl, options);
  }

  // 5. Merge AI discovery with regex fallback
  const discovered = mergePageDiscovery(pageMap, html, baseUrl);

  // 6. Fetch each discovered page (parallel)
  const fetchPromises = [];
  for (const [pageType, pageUrl] of Object.entries(discovered)) {
    if (!pageUrl) continue;
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
 * Fetch a page with retry logic.
 * On failure: retry with www toggle, then Google Cache fallback.
 */
async function fetchPageWithRetry(url) {
  // First attempt
  let html = await fetchPage(url);
  if (html) return html;

  // Retry with www toggle
  try {
    const parsed = new URL(url);
    if (parsed.hostname.startsWith('www.')) {
      parsed.hostname = parsed.hostname.replace('www.', '');
    } else {
      parsed.hostname = 'www.' + parsed.hostname;
    }
    await sleep(RETRY_DELAY_MS);
    html = await fetchPage(parsed.href);
    if (html) return html;
  } catch { /* ignore */ }

  // Google Cache fallback
  try {
    await sleep(RETRY_DELAY_MS);
    const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
    html = await fetchPage(cacheUrl);
    if (html) return html;
  } catch { /* ignore */ }

  return null;
}

/**
 * Wayback Machine fallback.
 */
async function fetchWaybackMachine(url) {
  try {
    const waybackUrl = `https://web.archive.org/web/2/${url}`;
    return await fetchPage(waybackUrl);
  } catch {
    return null;
  }
}

/**
 * Fetch a single page with timeout and realistic headers.
 * @returns {Promise<string|null>} HTML content or null on failure
 */
async function fetchPage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: REALISTIC_HEADERS,
      redirect: 'follow'
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Minimum content check — some blocked pages return tiny HTML
    if (text.length < 500) return null;
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch and parse sitemap.xml.
 * Returns array of page URLs.
 */
async function fetchSitemap(baseUrl) {
  const urls = [];
  try {
    const sitemapUrl = `${baseUrl.origin}/sitemap.xml`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(sitemapUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/xml,text/xml,*/*' },
    });
    clearTimeout(timeout);
    if (!res.ok) return urls;
    const xml = await res.text();

    // Extract <loc> tags
    const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
    let match;
    while ((match = locRegex.exec(xml)) !== null) {
      const loc = match[1].trim();
      // Only include same-domain URLs
      try {
        if (new URL(loc).hostname === baseUrl.hostname) {
          urls.push(loc);
        }
      } catch { /* skip invalid */ }
    }
  } catch { /* sitemap not available */ }
  return urls.slice(0, 200); // Cap at 200 URLs
}

/**
 * Fetch robots.txt for URL pattern hints.
 */
async function fetchRobotsTxt(baseUrl) {
  try {
    const robotsUrl = `${baseUrl.origin}/robots.txt`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Try to fetch RSS/Atom feed.
 */
async function fetchRssFeed(baseUrl) {
  const feedPaths = ['/feed', '/rss', '/blog/feed', '/atom.xml', '/rss.xml', '/feed.xml'];
  for (const path of feedPaths) {
    try {
      const feedUrl = `${baseUrl.origin}${path}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(feedUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/rss+xml,application/xml,text/xml,*/*' },
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const text = await res.text();
      if (text.includes('<rss') || text.includes('<feed') || text.includes('<atom')) {
        // Extract recent items
        const items = [];
        const titleRegex = /<title>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/title>/gi;
        const linkRegex = /<link[^>]*href=["']([^"']+)["']/gi;
        let m;
        while ((m = titleRegex.exec(text)) !== null && items.length < 10) {
          items.push(m[1].trim());
        }
        return { url: feedUrl, recent_titles: items.slice(1) }; // Skip feed title
      }
    } catch { /* continue */ }
  }
  return null;
}

/**
 * Extract JSON-LD structured data from HTML.
 */
function extractJsonLd(html) {
  const results = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());
      results.push(data);
    } catch { /* invalid JSON-LD, skip */ }
  }
  return results;
}

/**
 * Extract all same-domain links from HTML with their anchor text.
 */
function extractSameDomainLinks(html, baseUrl) {
  const links = [];
  const linkRegex = /href=["']([^"'#]+)["'][^>]*>([^<]*)/gi;
  let match;
  const seen = new Set();
  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const href = new URL(match[1], baseUrl).href;
      if (new URL(href).hostname === baseUrl.hostname && !seen.has(href)) {
        seen.add(href);
        links.push(href);
      }
    } catch { /* skip invalid */ }
  }
  return links;
}

/**
 * AI-assisted page discovery using Haiku.
 * Classifies a list of URLs into page types.
 */
async function aiPageDiscovery(urls, baseUrl, options) {
  const { aiRouter, aiModel } = options;
  if (!aiRouter || !aiModel) return {};

  try {
    // Limit to manageable size for AI
    const urlList = urls.slice(0, 80).map(u => {
      try {
        return new URL(u).pathname;
      } catch { return u; }
    }).join('\n');

    const prompt = `Given these URL paths from a B2B SaaS website (${baseUrl.hostname}), classify each into ONE category:
- pricing: pricing/plans information
- features: product features/capabilities
- about: company/team information
- integrations: integration/partner ecosystem
- blog: blog posts or news
- changelog: product updates/releases
- other: not relevant

URL paths:
${urlList}

Output ONLY valid JSON with the BEST single URL path for each category. Use null if no match:
{"pricing": "/path-or-null", "features": "/path-or-null", "about": "/path-or-null", "integrations": "/path-or-null", "blog": "/path-or-null", "changelog": "/path-or-null"}`;

    const res = await aiRouter('anthropic', {
      model: aiModel,
      system: 'You are a URL classifier. Output ONLY valid JSON.',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512,
      temperature: 0
    });

    const anthropic = require('../../shared/clients/anthropic');
    const text = anthropic.getText(res);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    const classified = JSON.parse(jsonMatch[0]);
    const pageMap = {};
    const typeToKey = {
      pricing: 'pricing_page', features: 'features_page', about: 'about_page',
      integrations: 'integrations_page', blog: 'blog_page', changelog: 'changelog_page'
    };

    for (const [type, path] of Object.entries(classified)) {
      if (path && typeToKey[type]) {
        try {
          pageMap[typeToKey[type]] = new URL(path, baseUrl).href;
        } catch { /* skip */ }
      }
    }
    return pageMap;
  } catch (err) {
    console.warn(`[scraper] AI page discovery failed: ${err.message}`);
    return {};
  }
}

/**
 * Merge AI-discovered pages with regex fallback.
 * AI takes priority; regex fills gaps.
 */
function mergePageDiscovery(aiPages, html, baseUrl) {
  const discovered = { ...aiPages };

  for (const [pageType, pattern] of Object.entries(PAGE_PATTERNS)) {
    if (discovered[pageType]) continue; // AI already found it
    const match = html.match(pattern);
    if (match) {
      try {
        const resolved = new URL(match[1], baseUrl).href;
        if (new URL(resolved).hostname === baseUrl.hostname) {
          discovered[pageType] = resolved;
        }
      } catch { /* invalid URL, skip */ }
    }
  }

  return discovered;
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
    case 'changelog_page':
      return extractChangelogPage(cleanText, html);
    case 'blog_page':
      return extractBlogPage(cleanText, html);
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
      logo: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      twitter_handle: extractMeta(html, 'twitter:site') || '',
    }
  };
}

// --- Subpage extractors ---

function extractPricingPage(text, html) {
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
  const yearMatch = text.match(/(?:founded|established|started|since)\s+(?:in\s+)?(\d{4})/i);
  const teamInfo = [];

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

/**
 * Extract changelog/release notes page.
 */
function extractChangelogPage(text, html) {
  const entries = [];
  // Look for dated entries: "YYYY-MM-DD", "Month DD, YYYY", "vX.X.X"
  const datePattern = /(\d{4}-\d{2}-\d{2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}|v\d+\.\d+(?:\.\d+)?)/gi;
  let match;
  while ((match = datePattern.exec(text)) !== null && entries.length < 15) {
    const date = match[1];
    // Get surrounding text (up to 200 chars after the date)
    const afterDate = text.slice(match.index, match.index + 300).trim();
    entries.push({ date, snippet: afterDate.slice(0, 200) });
  }

  return {
    raw_text: text.slice(0, 3000),
    entries: entries.slice(0, 10),
    found: true
  };
}

/**
 * Extract blog page — recent post titles and dates.
 */
function extractBlogPage(text, html) {
  const posts = [];

  // Extract article-like headings
  const headings = extractAllTags(html, 'h2').concat(extractAllTags(html, 'h3'));
  const uniqueHeadings = [...new Set(headings)].filter(h => h.length > 10 && h.length < 150);

  // Try to find time/date elements
  const dateRegex = /<time[^>]*datetime=["']([^"']+)["'][^>]*>/gi;
  const dates = [];
  let dm;
  while ((dm = dateRegex.exec(html)) !== null && dates.length < 10) {
    dates.push(dm[1]);
  }

  for (let i = 0; i < Math.min(uniqueHeadings.length, 10); i++) {
    posts.push({
      title: uniqueHeadings[i],
      date: dates[i] || null,
    });
  }

  return {
    raw_text: text.slice(0, 3000),
    posts: posts.slice(0, 10),
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { scrapeWebsite };
