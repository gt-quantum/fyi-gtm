/**
 * Prompt templates for the Research Agent.
 * All Perplexity queries and the consolidation prompt live here.
 *
 * Key improvements over v1:
 * - Product identity block anchors every query to the specific tool
 * - Cross-prompt context passes general findings to targeted queries
 * - INSUFFICIENT_DATA guardrail prevents hallucination
 * - Site-scoped searches target high-value review/comparison platforms
 * - Two new queries: company sources + community presence
 */

const PERPLEXITY_SYSTEM = `You are a GTM tool research analyst. Provide detailed, factual analysis with specific data points. Cite sources when possible.

CRITICAL: If you cannot find reliable, verifiable information about the specific product asked about, say INSUFFICIENT_DATA rather than guessing or returning data about a different product. Never fabricate review scores, user quotes, or pricing data.`;

/**
 * Build a product identity block included in ALL queries.
 * Anchors the model to the specific product.
 */
function buildProductIdentity(tool, scrapeData) {
  const desc = scrapeData?.homepage?.description || '';
  const title = scrapeData?.homepage?.title || tool.name;
  const domain = (() => { try { return new URL(tool.url).hostname; } catch { return ''; } })();
  const h1s = scrapeData?.homepage?.h1s?.slice(0, 3).join(' | ') || '';

  return `=== PRODUCT IDENTITY ===
Name: "${tool.name}"
URL: ${tool.url}
Domain: ${domain}
Website Title: ${title}
Website Description: ${desc}
${h1s ? `Headlines: ${h1s}` : ''}

CRITICAL: Only return information about THIS specific product ("${tool.name}" at ${domain}). If you cannot find reliable information, respond with INSUFFICIENT_DATA rather than guessing or returning data about a different product or company.
=== END IDENTITY ===`;
}

/**
 * Build the general research prompt (sonar-pro, comprehensive).
 */
function buildGeneralPrompt(tool, scrapeData) {
  const identity = buildProductIdentity(tool, scrapeData);
  const features = scrapeData?.features_page?.feature_sections?.join(', ') || '';

  return `${identity}

${features ? `Known features from their website: ${features}` : ''}

Provide a COMPREHENSIVE analysis covering:

1. **Product Overview** — Core purpose, what problem it solves, how it works
2. **Key Features** — List 5-10 specific features with descriptions. Note which are AI-powered.
3. **Target Audience** — Company sizes (startup/SMB/mid-market/enterprise), team roles, industries
4. **Integrations** — CRM, email, Slack, Salesforce, HubSpot, etc. Be specific.
5. **AI/Automation** — Is it AI-native, AI-enhanced, or traditional? What AI capabilities?
6. **Company Background** — Founded year, headquarters, employee count, funding, key people
7. **Unique Selling Points** — What differentiates it from alternatives?
8. **Recent Developments** — New features, funding rounds, acquisitions in the last 12 months

Be specific and factual. Include names, numbers, and dates where available.`;
}

/**
 * Build the pricing research prompt (sonar, targeted + site-scoped).
 */
function buildPricingPrompt(tool, scrapeData, generalContext) {
  const identity = buildProductIdentity(tool, scrapeData);
  const pricingHints = scrapeData?.pricing_page?.raw_text?.slice(0, 500) || '';

  return `${identity}

${generalContext ? `CONTEXT FROM GENERAL RESEARCH:\n${generalContext}\n` : ''}
${pricingHints ? `Pricing page text from their website: ${pricingHints}` : 'No pricing page found on their website.'}

Search the product's own website (${tool.url}) and pricing comparison sites for pricing information.

Provide SPECIFIC pricing details:
1. **Pricing Model** — subscription, usage-based, one-time, hybrid?
2. **Tier Names and Prices** — List each plan with exact dollar amounts (monthly/annual)
3. **Per-unit pricing** — per user, per seat, per contact, flat rate?
4. **Free Tier/Trial** — Is there a free plan? Free trial? How long?
5. **Contract Terms** — Monthly, annual, multi-year? Discounts for annual?
6. **Enterprise Pricing** — Custom/contact sales? Starting point if known?
7. **Notable Inclusions/Exclusions** — What do higher tiers unlock?

Focus on exact dollar amounts and plan names. If pricing is not publicly available, say so explicitly — do not guess.`;
}

/**
 * Build the reviews research prompt (sonar, targeted + site-scoped).
 */
function buildReviewsPrompt(tool, scrapeData, generalContext) {
  const identity = buildProductIdentity(tool, scrapeData);

  return `${identity}

${generalContext ? `CONTEXT FROM GENERAL RESEARCH:\n${generalContext}\n` : ''}

Search specifically on G2.com, Capterra.com, TrustRadius.com, and Reddit.com for reviews of "${tool.name}".

If this product has no listings on review platforms, say INSUFFICIENT_DATA rather than fabricating data.

Provide:
1. **Review Scores** — G2 rating, Capterra rating, TrustRadius score (with review counts). Only include if you find an actual listing on the platform.
2. **Common Praise** — What do users consistently love? List 3-5 themes with examples.
3. **Common Complaints** — What frustrates users? List 3-5 themes with examples.
4. **Notable User Quotes** — 3-5 specific quotes (positive and negative) with source
5. **Overall Sentiment** — Is it generally positive, mixed, or negative?
6. **Support Quality** — How do users rate customer support?
7. **Ease of Use** — Common feedback on UX/onboarding

Include specific quotes and cite sources (G2, Capterra, Reddit, etc.). If no reviews exist on these platforms for this product, explicitly state that.`;
}

/**
 * Build the competitors research prompt (sonar, targeted + site-scoped).
 */
function buildCompetitorsPrompt(tool, scrapeData, generalContext) {
  const identity = buildProductIdentity(tool, scrapeData);

  return `${identity}

${generalContext ? `CONTEXT FROM GENERAL RESEARCH:\n${generalContext}\n` : ''}

Search G2.com/compare pages and alternative.me for competitive comparisons of "${tool.name}".

Provide:
1. **Direct Competitors** — Tools that solve the same problem for the same audience (3-5)
2. **Indirect Competitors** — Broader platforms that include similar features (2-3)
3. **Adjacent Tools** — Complementary tools often used alongside (2-3)
4. **For each competitor**: Name, URL, key differentiators vs ${tool.name}, weaknesses vs ${tool.name}
5. **Market Positioning** — Where does ${tool.name} sit? (budget, mid-market, enterprise?)
6. **Competitive Advantages** — What does ${tool.name} do better than alternatives?
7. **Competitive Weaknesses** — Where do alternatives outperform ${tool.name}?

Be specific about HOW competitors differ, not just that they exist.`;
}

/**
 * Build company sources query (LinkedIn, Crunchbase, YC, AngelList).
 */
function buildCompanySourcesPrompt(tool, scrapeData, generalContext) {
  const identity = buildProductIdentity(tool, scrapeData);

  return `${identity}

${generalContext ? `CONTEXT FROM GENERAL RESEARCH:\n${generalContext}\n` : ''}

Search specifically on these platforms for information about the company behind "${tool.name}":

1. **LinkedIn** (linkedin.com/company/): Company page — employee count, headquarters, founded date, industry, specialties. Also search for founders/CEO/CTO profiles.
2. **Crunchbase** (crunchbase.com/organization/): Funding rounds, total raised, investors, founding date, employee range
3. **AngelList/Wellfound** (wellfound.com/company/): Startup profile, team, funding
4. **Y Combinator** (ycombinator.com/companies/): YC batch, description, team

For each source found, provide the URL and key data points. If a platform has no profile for this company, say so explicitly — do NOT fabricate profiles.

CRITICAL: Only return data about THIS specific company. Say INSUFFICIENT_DATA for any source where you cannot find a verified profile.`;
}

/**
 * Build community/launch presence query (Product Hunt, HN, Reddit, press).
 */
function buildCommunityPresencePrompt(tool, scrapeData, generalContext) {
  const identity = buildProductIdentity(tool, scrapeData);

  return `${identity}

${generalContext ? `CONTEXT FROM GENERAL RESEARCH:\n${generalContext}\n` : ''}

Search specifically on these platforms for "${tool.name}":

1. **Product Hunt** (producthunt.com/posts/): Launch date, upvotes, tagline, maker comments
2. **Hacker News** (news.ycombinator.com): Show HN posts, discussions mentioning this tool
3. **Reddit** (reddit.com): Posts and discussions specifically about this tool
4. **Twitter/X**: The company's official account and notable mentions
5. **TechCrunch, VentureBeat, or other tech press**: News articles about this company

For each source found, provide the URL and key information. If this tool has no presence on a platform, say INSUFFICIENT_DATA for that platform — do NOT fabricate.`;
}

/**
 * Build the consolidation prompt (Haiku, cross-references all sources).
 */
function buildConsolidationPrompt(tool, scrapeData, perplexityResults) {
  const sections = [];

  // Add scrape data summary
  if (scrapeData) {
    const pages = Object.entries(scrapeData)
      .filter(([k, v]) => v && v.found !== false && k !== 'homepage' && k !== 'json_ld' && k !== 'sitemap_urls' && k !== 'rss_feed')
      .map(([k]) => k);
    sections.push(`SCRAPED PAGES: ${pages.join(', ')}`);
    if (scrapeData.homepage?.description) {
      sections.push(`HOMEPAGE: ${scrapeData.homepage.description}`);
    }
    if (scrapeData.json_ld?.length) {
      sections.push(`JSON-LD STRUCTURED DATA: ${JSON.stringify(scrapeData.json_ld.slice(0, 2)).slice(0, 1000)}`);
    }
  }

  // Add each Perplexity result
  for (const [queryType, result] of Object.entries(perplexityResults)) {
    if (result?.response) {
      const isInsufficient = result.response.toUpperCase().includes('INSUFFICIENT_DATA');
      sections.push(`\n--- PERPLEXITY ${queryType.toUpperCase()} ${isInsufficient ? '(INSUFFICIENT DATA)' : ''} ---\n${result.response}`);
    }
  }

  return `You are consolidating research data for the GTM tool "${tool.name}" (${tool.url}).

Below is all data collected from website scraping and ${Object.keys(perplexityResults).length} Perplexity web searches. Your job is to:

1. **Cross-reference** — Identify claims that appear in multiple sources (higher confidence)
2. **Flag contradictions** — Where sources disagree (e.g., different pricing, conflicting feature claims)
3. **Identify gaps** — What important information is still missing or unverified?
4. **Assess completeness** — Rate data quality for: features, pricing, reviews, competitors, company info
5. **Flag INSUFFICIENT_DATA** — Note which queries returned insufficient data

${sections.join('\n')}

Output ONLY valid JSON:
{
  "verified_claims": ["claims confirmed by 2+ sources"],
  "contradictions": [{"topic": "...", "source_a": "...", "source_b": "...", "details": "..."}],
  "gaps": ["missing information that would be valuable"],
  "insufficient_queries": ["list of query types that returned INSUFFICIENT_DATA"],
  "completeness": {
    "features": "high|medium|low",
    "pricing": "high|medium|low",
    "reviews": "high|medium|low",
    "competitors": "high|medium|low",
    "company_info": "high|medium|low"
  },
  "source_quality": {
    "scraper_worked": true or false,
    "json_ld_found": true or false,
    "review_platforms_found": ["g2", "capterra", etc.],
    "company_profiles_found": ["linkedin", "crunchbase", etc.]
  },
  "notes": "any other observations"
}`;
}

module.exports = {
  PERPLEXITY_SYSTEM,
  buildProductIdentity,
  buildGeneralPrompt,
  buildPricingPrompt,
  buildReviewsPrompt,
  buildCompetitorsPrompt,
  buildCompanySourcesPrompt,
  buildCommunityPresencePrompt,
  buildConsolidationPrompt
};
