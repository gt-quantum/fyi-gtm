/**
 * Website scraper for the Research Agent.
 * Fetches a URL and extracts key metadata.
 */

const TIMEOUT_MS = 15000;

/**
 * Scrape a website and extract structured metadata.
 *
 * @param {string} url - URL to scrape
 * @returns {Promise<Object>} Structured website data
 */
async function scrapeWebsite(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FYI-GTM-Bot/1.0; +https://fyi.wtf)',
        'Accept': 'text/html,application/xhtml+xml'
      },
      redirect: 'follow'
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const html = await res.text();
    const data = extractMetadata(html, url);
    data.scrapedAt = new Date().toISOString();

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extract metadata from HTML without a DOM parser (lightweight for Railway).
 */
function extractMetadata(html, url) {
  const domain = new URL(url).hostname.replace('www.', '');

  return {
    url,
    logo: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    name: extractMeta(html, 'og:site_name') || extractMeta(html, 'application-name') || domain,
    pageTitle: extractTag(html, 'title') || '',
    description: extractMeta(html, 'description') || extractMeta(html, 'og:description') || '',
    hasPricingPage: hasPricingLink(html),
    featureMentions: countFeatureMentions(html)
  };
}

function extractTag(html, tag) {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i'));
  return match ? decodeEntities(match[1].trim()) : null;
}

function extractMeta(html, name) {
  // Try name= and property= attributes
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

function hasPricingLink(html) {
  return /href=["'][^"']*pric/i.test(html);
}

function countFeatureMentions(html) {
  const keywords = ['feature', 'integration', 'automat', 'analytics', 'dashboard', 'workflow', 'ai ', 'machine learning'];
  let count = 0;
  const lower = html.toLowerCase();
  for (const kw of keywords) {
    const matches = lower.match(new RegExp(kw, 'g'));
    if (matches) count += matches.length;
  }
  return count;
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
