/**
 * Research Agent — Phase 3
 *
 * Picks queued tools from the tools table, scrapes their website,
 * runs Perplexity search for reviews/pricing, then uses Claude to
 * synthesize structured classification data.
 *
 * Updates tools row with research_status='complete'.
 */
const { supabase } = require('../../shared/clients/supabase');
const { logStep, createExecution, completeExecution } = require('../../shared/database/queries');
const anthropic = require('../../shared/clients/anthropic');
const perplexity = require('../../shared/clients/perplexity');
const { scrapeWebsite } = require('./scraper');

// --- Module Exports (discovery pattern) ---
module.exports = {
  name: 'Research Agent',
  description: 'Scrapes and researches GTM tools, populates structured data in the tools table',
  type: 'agent',
  schedule: 'manual',
  enabled: true,
  tags: ['research', 'tools'],
  runtime: 'railway',

  flow: {
    steps: [
      { id: 'fetch_queue', label: 'Fetch Queued Tools', type: 'action', icon: 'database' },
      { id: 'scrape', label: 'Scrape Website', type: 'action', icon: 'globe' },
      { id: 'perplexity', label: 'Perplexity Research', type: 'ai', icon: 'sparkle' },
      { id: 'synthesis', label: 'Claude Synthesis', type: 'ai', icon: 'sparkle' },
      { id: 'update_tool', label: 'Update Tool Record', type: 'output', icon: 'check' },
    ],
    edges: [
      { from: 'fetch_queue', to: 'scrape' },
      { from: 'scrape', to: 'perplexity' },
      { from: 'perplexity', to: 'synthesis' },
      { from: 'synthesis', to: 'update_tool' },
      { from: 'update_tool', to: 'scrape', label: 'next tool' },
    ],
  },

  /**
   * Validate environment before running.
   */
  async validate() {
    const errors = [];
    if (!process.env.ANTHROPIC_API_KEY) errors.push('Missing ANTHROPIC_API_KEY');
    if (!process.env.PERPLEXITY_API_KEY) errors.push('Missing PERPLEXITY_API_KEY');
    if (!process.env.SUPABASE_URL) errors.push('Missing SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_KEY) errors.push('Missing SUPABASE_SERVICE_KEY');
    return { valid: errors.length === 0, errors };
  },

  /**
   * Main execution: process all queued tools (or a specific tool_id from context).
   */
  async execute(context) {
    const { executionId, toolId } = context;
    let processed = 0;
    let failed = 0;

    // Get tools to research
    let query = supabase
      .from('tools')
      .select('id, name, slug, url')
      .eq('research_status', 'queued')
      .order('created_at', { ascending: true });

    // If triggered for a specific tool, override
    if (toolId) {
      query = supabase
        .from('tools')
        .select('id, name, slug, url')
        .eq('id', toolId);
    }

    const { data: tools, error: fetchError } = await query;

    if (fetchError) throw new Error(`Failed to fetch queued tools: ${fetchError.message}`);
    if (!tools || tools.length === 0) {
      await logStep(executionId, 'fetch_queue', 'completed', { message: 'No queued tools found' });
      return { processed: 0, failed: 0 };
    }

    await logStep(executionId, 'fetch_queue', 'completed', { count: tools.length });

    for (const tool of tools) {
      try {
        await researchTool(tool, executionId);
        processed++;
      } catch (err) {
        console.error(`[research] Failed for ${tool.slug}:`, err.message);
        await logStep(executionId, `research_${tool.slug}`, 'failed', { error: err.message });

        // Mark as failed so it doesn't block the queue
        await supabase
          .from('tools')
          .update({ research_status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', tool.id);

        failed++;
      }
    }

    return { processed, failed, total: tools.length };
  }
};

// ----------------------------------------------------------------
// Core research pipeline for a single tool
// ----------------------------------------------------------------

async function researchTool(tool, executionId) {
  console.log(`[research] Starting: ${tool.name} (${tool.url})`);

  // 1. Mark as researching
  await supabase
    .from('tools')
    .update({ research_status: 'researching', updated_at: new Date().toISOString() })
    .eq('id', tool.id);

  await logStep(executionId, `scrape_${tool.slug}`, 'started');

  // 2. Scrape website
  let websiteData;
  try {
    websiteData = await scrapeWebsite(tool.url);
  } catch (err) {
    console.warn(`[research] Scrape failed for ${tool.slug}: ${err.message}`);
    websiteData = { url: tool.url, error: err.message, scrapedAt: new Date().toISOString() };
  }

  await logStep(executionId, `scrape_${tool.slug}`, 'completed', {
    hasData: !websiteData.error,
    pageTitle: websiteData.pageTitle
  });

  // 3. Perplexity deep research
  await logStep(executionId, `perplexity_${tool.slug}`, 'started');

  const perplexityRes = await perplexity.ask({
    model: 'sonar-pro',
    system: 'You are a GTM tool research analyst. Provide detailed, factual analysis.',
    messages: [{
      role: 'user',
      content: buildPerplexityPrompt(tool, websiteData)
    }],
    search_recency_filter: 'month'
  });

  const researchText = perplexity.getText(perplexityRes);
  const citations = perplexity.getCitations(perplexityRes);

  await logStep(executionId, `perplexity_${tool.slug}`, 'completed', {
    charCount: researchText.length,
    citationCount: citations.length
  });

  // 4. Claude synthesis — structured classification
  await logStep(executionId, `synthesis_${tool.slug}`, 'started');

  const synthesisRes = await anthropic.ask({
    model: 'claude-haiku-4-5-20250514',
    max_tokens: 4096,
    temperature: 0.3,
    system: SYNTHESIS_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: buildSynthesisPrompt(tool, websiteData, researchText)
    }]
  });

  const synthesisText = anthropic.getText(synthesisRes);
  let classification;

  try {
    // Extract JSON from the response (handles markdown code blocks)
    const jsonMatch = synthesisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in synthesis response');
    classification = JSON.parse(jsonMatch[0]);
  } catch (parseErr) {
    console.error(`[research] Failed to parse synthesis for ${tool.slug}:`, parseErr.message);
    throw new Error(`Synthesis parse failed: ${parseErr.message}`);
  }

  await logStep(executionId, `synthesis_${tool.slug}`, 'completed', {
    category: classification.primary_category,
    tagCount: classification.tags?.length
  });

  // 5. Update tools row
  const updatePayload = {
    website_data: websiteData,
    research_blob: researchText,
    review_data: { citations, perplexity_model: 'sonar-pro' },
    summary: classification.summary || null,
    category: classification.category || null,
    primary_category: classification.primary_category || null,
    categories: classification.categories || [],
    group_name: classification.group_name || null,
    tags: classification.tags || [],
    pricing: classification.pricing || null,
    price_note: classification.price_note || null,
    pricing_tags: classification.pricing_tags || [],
    company_size: classification.company_size || [],
    ai_automation: classification.ai_automation || [],
    integrations: classification.integrations || [],
    research_status: 'complete',
    research_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error: updateError } = await supabase
    .from('tools')
    .update(updatePayload)
    .eq('id', tool.id);

  if (updateError) throw new Error(`Failed to update tool: ${updateError.message}`);

  console.log(`[research] Completed: ${tool.name} → ${classification.primary_category}`);
}

// ----------------------------------------------------------------
// Prompts
// ----------------------------------------------------------------

function buildPerplexityPrompt(tool, websiteData) {
  const desc = websiteData.description || '';
  const title = websiteData.pageTitle || tool.name;

  return `Research the GTM/sales tool "${tool.name}" (${tool.url}).

Website title: ${title}
Website description: ${desc}

Provide a comprehensive analysis covering:
1. **What it does** — core product purpose and key features
2. **Pricing** — plans, pricing tiers, free trial availability. Be specific with dollar amounts if available.
3. **Target audience** — company size, team roles, industries
4. **Key integrations** — CRM, email, Slack, etc.
5. **User sentiment** — strengths and weaknesses from reviews (G2, Capterra, Reddit)
6. **Competitive positioning** — how it compares to alternatives
7. **AI/automation capabilities** — any AI-native or AI-enhanced features
8. **Unique selling points** — what makes it stand out

Focus on factual, verifiable information. Include specific details where possible.`;
}

const SYNTHESIS_SYSTEM_PROMPT = `You are a GTM tool classification engine. Given website data and research, output a JSON object with structured fields for a tool directory.

IMPORTANT: Output ONLY valid JSON. No markdown, no explanation, just the JSON object.

The valid values for each field are:

**primary_category** (pick ONE):
intent-signals, ai-sales-assistants, lead-management, sales-engagement, crm-platforms, email-marketing, abm-platforms, data-enrichment, conversation-intelligence, content-creation, sales-enablement, analytics-reporting, meeting-scheduling, proposal-cpq, customer-success, marketing-automation, advertising, social-selling, competitive-intelligence, revenue-operations

**group_name** (pick ONE):
data-intelligence, sales-automation, marketing-platforms, revenue-tools, content-tools, operations

**pricing** (pick ONE):
free, freemium, starter, mid-market, enterprise, custom, usage-based

**company_size** (pick 1-3):
startup, smb, mid-market, enterprise

**ai_automation** (pick 1-2):
ai-native, ai-enhanced, automation-focused, traditional

**pricing_tags** (pick 1-2):
free-tier, affordable, mid-range, enterprise-pricing, usage-based, custom-pricing`;

function buildSynthesisPrompt(tool, websiteData, researchText) {
  return `Classify this GTM tool based on the research below.

TOOL: ${tool.name} (${tool.url})
WEBSITE TITLE: ${websiteData.pageTitle || 'N/A'}
WEBSITE DESCRIPTION: ${websiteData.description || 'N/A'}

RESEARCH:
${researchText}

Output a JSON object with these fields:
{
  "summary": "1-2 sentence description of what the tool does",
  "category": "Human-readable category name (e.g. 'Marketing Automation')",
  "primary_category": "slug from the allowed list",
  "categories": ["primary + up to 3 related category slugs"],
  "group_name": "slug from the allowed list",
  "tags": ["5-10 lowercase tags like 'lead-generation', 'ai', 'crm'"],
  "pricing": "slug from the allowed list",
  "price_note": "specific pricing details if known, e.g. 'Starts at $49/mo'",
  "pricing_tags": ["1-2 slugs from the allowed list"],
  "company_size": ["1-3 slugs from the allowed list"],
  "ai_automation": ["1-2 slugs from the allowed list"],
  "integrations": ["lowercase integration names like 'hubspot', 'salesforce', 'slack'"]
}`;
}
