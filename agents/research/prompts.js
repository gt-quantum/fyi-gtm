/**
 * Prompt templates for the Research Agent.
 * All Perplexity queries and the consolidation prompt live here.
 */

const PERPLEXITY_SYSTEM = 'You are a GTM tool research analyst. Provide detailed, factual analysis with specific data points. Cite sources when possible.';

/**
 * Build the general research prompt (sonar-pro, comprehensive).
 */
function buildGeneralPrompt(tool, scrapeData) {
  const desc = scrapeData?.homepage?.description || '';
  const title = scrapeData?.homepage?.title || tool.name;
  const features = scrapeData?.features_page?.feature_sections?.join(', ') || '';

  return `Research the GTM/sales tool "${tool.name}" (${tool.url}).

Website title: ${title}
Website description: ${desc}
${features ? `Known features: ${features}` : ''}

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
 * Build the pricing research prompt (sonar, targeted).
 */
function buildPricingPrompt(tool, scrapeData) {
  const pricingHints = scrapeData?.pricing_page?.raw_text?.slice(0, 500) || '';

  return `Research the pricing for "${tool.name}" (${tool.url}).

${pricingHints ? `Pricing page text: ${pricingHints}` : 'No pricing page found on website.'}

Provide SPECIFIC pricing details:
1. **Pricing Model** — subscription, usage-based, one-time, hybrid?
2. **Tier Names and Prices** — List each plan with exact dollar amounts (monthly/annual)
3. **Per-unit pricing** — per user, per seat, per contact, flat rate?
4. **Free Tier/Trial** — Is there a free plan? Free trial? How long?
5. **Contract Terms** — Monthly, annual, multi-year? Discounts for annual?
6. **Enterprise Pricing** — Custom/contact sales? Starting point if known?
7. **Notable Inclusions/Exclusions** — What do higher tiers unlock?

Focus on exact dollar amounts and plan names. If pricing is not publicly available, say so.`;
}

/**
 * Build the reviews research prompt (sonar, targeted).
 */
function buildReviewsPrompt(tool) {
  return `Research user reviews and sentiment for "${tool.name}" (${tool.url}).

Find reviews from G2, Capterra, TrustRadius, Reddit, and other review platforms.

Provide:
1. **Review Scores** — G2 rating, Capterra rating, TrustRadius score (with review counts)
2. **Common Praise** — What do users consistently love? List 3-5 themes with examples.
3. **Common Complaints** — What frustrates users? List 3-5 themes with examples.
4. **Notable User Quotes** — 3-5 specific quotes (positive and negative) with source
5. **Overall Sentiment** — Is it generally positive, mixed, or negative?
6. **Support Quality** — How do users rate customer support?
7. **Ease of Use** — Common feedback on UX/onboarding

Include specific quotes and cite sources (G2, Capterra, Reddit, etc.).`;
}

/**
 * Build the competitors research prompt (sonar, targeted).
 */
function buildCompetitorsPrompt(tool, scrapeData) {
  const category = scrapeData?.homepage?.description || '';

  return `Research the competitive landscape for "${tool.name}" (${tool.url}).

${category ? `Product description: ${category}` : ''}

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
 * Build the consolidation prompt (Haiku, cross-references all sources).
 */
function buildConsolidationPrompt(tool, scrapeData, perplexityResults) {
  const sections = [];

  // Add scrape data summary
  if (scrapeData) {
    const pages = Object.entries(scrapeData)
      .filter(([k, v]) => v && v.found !== false)
      .map(([k]) => k);
    sections.push(`SCRAPED PAGES: ${pages.join(', ')}`);
    if (scrapeData.homepage?.description) {
      sections.push(`HOMEPAGE: ${scrapeData.homepage.description}`);
    }
  }

  // Add each Perplexity result
  for (const [queryType, result] of Object.entries(perplexityResults)) {
    if (result?.response) {
      sections.push(`\n--- PERPLEXITY ${queryType.toUpperCase()} ---\n${result.response}`);
    }
  }

  return `You are consolidating research data for the GTM tool "${tool.name}" (${tool.url}).

Below is all data collected from website scraping and 4 Perplexity web searches. Your job is to:

1. **Cross-reference** — Identify claims that appear in multiple sources (higher confidence)
2. **Flag contradictions** — Where sources disagree (e.g., different pricing, conflicting feature claims)
3. **Identify gaps** — What important information is still missing or unverified?
4. **Assess completeness** — Rate data quality for: features, pricing, reviews, competitors, company info

${sections.join('\n')}

Output ONLY valid JSON:
{
  "verified_claims": ["claims confirmed by 2+ sources"],
  "contradictions": [{"topic": "...", "source_a": "...", "source_b": "...", "details": "..."}],
  "gaps": ["missing information that would be valuable"],
  "completeness": {
    "features": "high|medium|low",
    "pricing": "high|medium|low",
    "reviews": "high|medium|low",
    "competitors": "high|medium|low",
    "company_info": "high|medium|low"
  },
  "notes": "any other observations"
}`;
}

module.exports = {
  PERPLEXITY_SYSTEM,
  buildGeneralPrompt,
  buildPricingPrompt,
  buildReviewsPrompt,
  buildCompetitorsPrompt,
  buildConsolidationPrompt
};
