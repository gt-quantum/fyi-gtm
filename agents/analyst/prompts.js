/**
 * Prompt templates for the Analyst Agent.
 * Extraction, classification, and summary prompts.
 */

const EXTRACTION_SYSTEM = 'You are a data extraction engine. Extract structured data from research text. Output ONLY valid JSON — no markdown, no explanation.';

const CLASSIFICATION_SYSTEM = `You are a GTM tool classification engine. Classify tools into the EXACT taxonomy below. Output ONLY valid JSON. Use ONLY the slugs listed — no others.

**primary_category** (pick ONE from these 27):
contact-company-data, data-enrichment-hygiene, intent-signals, market-competitive-research, ai-data-agents,
marketing-automation-email, abm-demand-gen, content-creative, social-community, seo-organic, ai-marketing-tools,
crm, sales-engagement, sales-enablement, cpq-proposals, ai-sales-assistants,
lead-management, pipeline-forecasting, revenue-analytics-attribution, workflow-integration, ai-revops-tools,
customer-success, product-analytics-adoption, support-feedback, ai-customer-tools,
partner-management, affiliates-referrals, ai-partnership-tools

**group_name** (pick ONE — must match the primary_category's group):
data-intelligence → contact-company-data, data-enrichment-hygiene, intent-signals, market-competitive-research, ai-data-agents
marketing → marketing-automation-email, abm-demand-gen, content-creative, social-community, seo-organic, ai-marketing-tools
sales → crm, sales-engagement, sales-enablement, cpq-proposals, ai-sales-assistants
revenue-operations → lead-management, pipeline-forecasting, revenue-analytics-attribution, workflow-integration, ai-revops-tools
customer → customer-success, product-analytics-adoption, support-feedback, ai-customer-tools
partnerships → partner-management, affiliates-referrals, ai-partnership-tools

**pricing** (pick ONE):
free | freemium | paid | enterprise

**company_size** (pick 1-3):
smb | mid-market | enterprise

**ai_automation** (pick 1-2):
ai-native | ai-enhanced | automation

**pricing_tags** (pick 1-2):
free-tier | freemium | paid-only | enterprise-pricing`;

/**
 * Features + use cases + recent developments extraction prompt.
 */
function buildFeaturesPrompt(toolName, rawResearch) {
  const context = buildResearchContext(rawResearch);
  return `Extract key features, use cases, and recent developments for "${toolName}".

${context}

Output JSON:
{
  "key_features": [
    {
      "name": "Feature Name",
      "description": "2-3 sentence description of what it does and why it matters",
      "category": "analytics|automation|integration|communication|data|ai|workflow|reporting",
      "differentiator": true or false (is this a standout feature vs competitors?)
    }
  ],
  "use_cases": [
    {
      "title": "Use Case Name",
      "description": "How teams use this feature",
      "persona": "sales-rep|sales-leader|marketer|revops|cs-rep|founder"
    }
  ],
  "recent_developments": [
    {
      "title": "What happened",
      "date": "approximate date or quarter",
      "type": "feature|funding|partnership|acquisition|milestone"
    }
  ]
}

Extract 5-10 key features, 3-6 use cases, and any recent developments from the last 12 months.`;
}

/**
 * Sentiment + pros/cons + ratings extraction prompt.
 */
function buildSentimentPrompt(toolName, rawResearch) {
  const reviews = rawResearch.perplexity_reviews?.response || '';
  const general = rawResearch.perplexity_general?.response || '';
  const community = rawResearch.perplexity_community?.response || '';

  return `Extract user sentiment, pros/cons, and ratings for "${toolName}".

REVIEW RESEARCH:
${reviews}

${community ? `COMMUNITY PRESENCE (ProductHunt/HN/Reddit):\n${community.slice(0, 2000)}` : ''}

GENERAL RESEARCH (for additional context):
${general.slice(0, 2000)}

Output JSON:
{
  "pros_cons": {
    "pros": [
      { "title": "Short title", "description": "Detail", "category": "usability|features|support|pricing|integration|performance" }
    ],
    "cons": [
      { "title": "Short title", "description": "Detail", "category": "usability|features|support|pricing|integration|performance" }
    ]
  },
  "user_sentiment": {
    "overall_sentiment": "positive|mixed|negative",
    "praise_themes": [
      { "theme": "Theme name", "detail": "What users say", "frequency": "common|occasional|rare" }
    ],
    "complaint_themes": [
      { "theme": "Theme name", "detail": "What users say", "frequency": "common|occasional|rare" }
    ],
    "notable_quotes": [
      { "quote": "Exact or paraphrased quote", "source": "g2|capterra|reddit|trustradius|other", "sentiment": "positive|negative" }
    ]
  },
  "ratings": {
    "g2_score": null or number (e.g. 4.5),
    "g2_reviews": null or number,
    "capterra_score": null or number,
    "capterra_reviews": null or number,
    "trustradius_score": null or number
  }
}

Extract 3-5 pros, 3-5 cons, 3-5 themes each, and 3-5 notable quotes. Use null for unknown ratings.

CRITICAL: If no reviews exist on G2, Capterra, or TrustRadius for this specific product, set ALL rating scores to null and review counts to null. Only include ratings you can verify from the research data. Do NOT fabricate review scores.`;
}

/**
 * Pricing extraction prompt.
 */
function buildPricingPrompt(toolName, rawResearch) {
  const pricing = rawResearch.perplexity_pricing?.response || '';
  const scrape = rawResearch.scrape?.pricing_page || {};

  return `Extract structured pricing information for "${toolName}".

PRICING RESEARCH:
${pricing}

${scrape.found ? `PRICING PAGE DATA:\n${scrape.raw_text?.slice(0, 1500) || ''}\nDetected tiers: ${(scrape.tiers_detected || []).join(', ')}\nDetected prices: ${(scrape.prices_detected || []).join(', ')}` : 'No pricing page found on website.'}

Output JSON:
{
  "pricing_info": {
    "model": "subscription|usage-based|one-time|hybrid",
    "transparency": "transparent|semi-transparent|opaque",
    "tiers": [
      {
        "name": "Plan Name",
        "price_amount": 49 or null,
        "price_period": "month|year|one-time",
        "price_per": "user|seat|contact|account|flat",
        "features_summary": "Key included features"
      }
    ],
    "free_trial": true or false,
    "free_trial_details": "14-day trial" or null,
    "contract_terms": "Monthly/Annual/Custom",
    "entry_cost_summary": "Starts at $X/user/month",
    "scaling_notes": "Volume discounts, enterprise pricing details"
  }
}

Be specific with dollar amounts. Use null when pricing is not publicly available.`;
}

/**
 * Competitors extraction prompt.
 */
function buildCompetitorsPrompt(toolName, rawResearch) {
  const competitors = rawResearch.perplexity_competitors?.response || '';
  const general = rawResearch.perplexity_general?.response || '';

  return `Extract competitor data for "${toolName}".

COMPETITOR RESEARCH:
${competitors}

GENERAL RESEARCH (for context):
${general.slice(0, 2000)}

Output JSON:
{
  "competitors": [
    {
      "name": "Competitor Name",
      "url": "https://competitor.com" or null,
      "relationship": "direct|indirect|adjacent",
      "differentiators": ["What this competitor does better"],
      "weaknesses_vs": ["Where ${toolName} wins"]
    }
  ]
}

List 3-8 competitors. Direct = same problem/audience, indirect = broader platform with overlap, adjacent = complementary tool.`;
}

/**
 * Company info extraction prompt.
 */
function buildCompanyInfoPrompt(toolName, rawResearch) {
  const general = rawResearch.perplexity_general?.response || '';
  const aboutPage = rawResearch.scrape?.about_page || {};
  const companyData = rawResearch.perplexity_company?.response || '';
  const jsonLd = rawResearch.scrape?.json_ld || [];

  return `Extract company information for the company behind "${toolName}".

GENERAL RESEARCH:
${general}

${companyData ? `COMPANY SOURCES (LinkedIn/Crunchbase/YC):\n${companyData.slice(0, 3000)}` : ''}

${aboutPage.found ? `ABOUT PAGE:\n${aboutPage.raw_text?.slice(0, 1500) || ''}\n${aboutPage.team_info ? `Team mentions: ${aboutPage.team_info}` : ''}${aboutPage.founded_year ? `\nFounded: ${aboutPage.founded_year}` : ''}` : ''}

${jsonLd.length ? `STRUCTURED DATA (JSON-LD):\n${JSON.stringify(jsonLd.slice(0, 3), null, 2).slice(0, 1000)}` : ''}

Output JSON:
{
  "company_info": {
    "founded_year": 2015 or null,
    "headquarters": "City, State/Country" or null,
    "employee_count": "1-50|50-200|200-500|500-1000|1000+" or null,
    "key_people": [
      { "name": "Full Name", "title": "CEO/CTO/etc" }
    ],
    "funding": {
      "total": "$50M" or null,
      "last_round": "Series B" or null,
      "last_round_date": "2024" or null
    },
    "customer_count": "5000+" or null,
    "notable_customers": ["Company1", "Company2"]
  }
}

Use null for any information that is not available or uncertain.`;
}

/**
 * Classification prompt (taxonomy assignment).
 */
function buildClassificationPrompt(toolName, toolUrl, rawResearch, extractedFeatures, extractedPricing) {
  const general = rawResearch.perplexity_general?.response || '';
  const description = rawResearch.scrape?.homepage?.description || '';
  const features = extractedFeatures?.key_features?.map(f => f.name).join(', ') || '';
  const pricingModel = extractedPricing?.pricing_info?.model || '';

  return `Classify this GTM tool into the taxonomy.

TOOL: ${toolName} (${toolUrl})
DESCRIPTION: ${description}
KEY FEATURES: ${features}
PRICING MODEL: ${pricingModel}

RESEARCH SUMMARY:
${general.slice(0, 3000)}

Output JSON:
{
  "category": "Human-readable category (e.g. 'Marketing Automation')",
  "primary_category": "slug from the allowed primary_category list",
  "categories": ["primary + up to 3 related category slugs"],
  "group_name": "slug from the allowed group_name list",
  "tags": ["5-10 lowercase descriptive tags like 'lead-generation', 'ai', 'crm-integration'"],
  "pricing": "slug from the allowed pricing list",
  "price_note": "Brief pricing summary, e.g. 'Starts at $49/user/month'",
  "pricing_tags": ["1-2 slugs from the allowed pricing_tags list"],
  "company_size": ["1-3 slugs from the allowed company_size list"],
  "ai_automation": ["1-2 slugs from the allowed ai_automation list"],
  "integrations": ["lowercase integration names: 'hubspot', 'salesforce', 'slack', etc."]
}`;
}

/**
 * Summary generation prompt.
 */
function buildSummaryPrompt(toolName, toolUrl, rawResearch, extractedFeatures) {
  const description = rawResearch.scrape?.homepage?.description || '';
  const features = extractedFeatures?.key_features?.slice(0, 5).map(f => `${f.name}: ${f.description}`).join('\n') || '';
  const useCases = extractedFeatures?.use_cases?.map(u => u.title).join(', ') || '';

  return `Write a concise summary for the GTM tool "${toolName}" (${toolUrl}).

WEBSITE DESCRIPTION: ${description}
TOP FEATURES:
${features}
USE CASES: ${useCases}

Output JSON:
{
  "summary": "1-2 sentence description of what the tool does and who it's for. Be specific, not generic.",
  "best_for": "One sentence: 'Best for [persona] who need [specific capability]'"
}`;
}

// --- Helpers ---

function buildResearchContext(rawResearch) {
  const sections = [];

  if (rawResearch.scrape?.homepage?.description) {
    sections.push(`HOMEPAGE: ${rawResearch.scrape.homepage.description}`);
  }
  if (rawResearch.scrape?.json_ld?.length) {
    sections.push(`STRUCTURED DATA (JSON-LD):\n${JSON.stringify(rawResearch.scrape.json_ld.slice(0, 3), null, 2).slice(0, 1500)}`);
  }
  if (rawResearch.scrape?.features_page?.found) {
    sections.push(`FEATURES PAGE: ${rawResearch.scrape.features_page.raw_text?.slice(0, 1500) || ''}`);
  }
  if (rawResearch.scrape?.changelog_page?.found) {
    sections.push(`CHANGELOG: ${rawResearch.scrape.changelog_page.raw_text?.slice(0, 1000) || ''}`);
  }
  if (rawResearch.scrape?.blog_page?.found) {
    sections.push(`BLOG: ${rawResearch.scrape.blog_page.raw_text?.slice(0, 1000) || ''}`);
  }
  if (rawResearch.perplexity_general?.response) {
    sections.push(`GENERAL RESEARCH:\n${rawResearch.perplexity_general.response}`);
  }
  if (rawResearch.perplexity_company?.response) {
    sections.push(`COMPANY SOURCES (LinkedIn/Crunchbase/YC):\n${rawResearch.perplexity_company.response.slice(0, 2000)}`);
  }
  if (rawResearch.perplexity_community?.response) {
    sections.push(`COMMUNITY PRESENCE (ProductHunt/HN/Reddit):\n${rawResearch.perplexity_community.response.slice(0, 2000)}`);
  }

  return sections.join('\n\n');
}

module.exports = {
  EXTRACTION_SYSTEM,
  CLASSIFICATION_SYSTEM,
  buildFeaturesPrompt,
  buildSentimentPrompt,
  buildPricingPrompt,
  buildCompetitorsPrompt,
  buildCompanyInfoPrompt,
  buildClassificationPrompt,
  buildSummaryPrompt
};
