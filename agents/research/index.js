/**
 * Research Agent — Comprehensive Data Gathering
 *
 * Pipeline: Fetch queue → Multi-page scrape → 4 Perplexity searches
 * (general/pricing/reviews/competitors) → Haiku consolidation → Store + trigger Analyst.
 *
 * Writes raw_research JSONB, research_sources, sets research_status='researched'.
 * Chains to Analyst Agent for structuring.
 */
const { supabase } = require('../../shared/clients/supabase');
const { logStep, createExecution, completeExecution } = require('../../shared/database/queries');
const { getConfig } = require('../../shared/clients/config');
const { ask } = require('../../shared/clients/ai');
const perplexity = require('../../shared/clients/perplexity');
const { scrapeWebsite } = require('./scraper');
const { createTracker } = require('./sources');
const prompts = require('./prompts');

module.exports = {
  name: 'Research Agent',
  description: 'Comprehensive data gathering: scrapes websites, runs targeted web searches, consolidates findings into raw_research JSONB',
  type: 'agent',
  schedule: 'manual',
  enabled: true,
  tags: ['research', 'tools', 'data-gathering'],
  runtime: 'railway',

  prompts: {
    perplexity_system: prompts.PERPLEXITY_SYSTEM,
    perplexity_general: 'Comprehensive product analysis — features, audience, AI capabilities, company background, USPs',
    perplexity_pricing: 'Targeted pricing lookup — exact dollar amounts, tier names, free trial, contract terms',
    perplexity_reviews: 'User sentiment — G2/Capterra/Reddit ratings, specific praise/complaints, user quotes',
    perplexity_competitors: 'Competitive landscape — named alternatives, market segment, differentiators',
    consolidation: 'Cross-reference all sources, identify contradictions, flag gaps, assess completeness',
  },

  operationalParams: {
    perplexity_main_model: 'sonar-pro (configurable: research_perplexity_main_model)',
    perplexity_targeted_model: 'sonar (configurable: research_perplexity_targeted_model)',
    consolidation_model: 'claude-haiku-4-5 (configurable: research_consolidation_model)',
    consolidation_provider: 'anthropic (configurable: research_consolidation_provider)',
    search_recency_filter: 'month',
    max_pages_scraped: '5 (homepage + pricing/features/about/integrations)',
    scrape_timeout: '20s per page',
  },

  flow: {
    triggers: ['agents/analyst'],
    steps: [
      { id: 'fetch_queue', label: 'Fetch Queued Tools', type: 'action', icon: 'database' },
      { id: 'scrape', label: 'Multi-Page Scrape', type: 'action', icon: 'globe' },
      { id: 'perplexity_general', label: 'Perplexity: General', type: 'ai', icon: 'sparkle' },
      { id: 'perplexity_pricing', label: 'Perplexity: Pricing', type: 'ai', icon: 'sparkle' },
      { id: 'perplexity_reviews', label: 'Perplexity: Reviews', type: 'ai', icon: 'sparkle' },
      { id: 'perplexity_competitors', label: 'Perplexity: Competitors', type: 'ai', icon: 'sparkle' },
      { id: 'consolidation', label: 'Consolidation', type: 'ai', icon: 'sparkle' },
      { id: 'store', label: 'Store + Trigger Analyst', type: 'output', icon: 'check' },
    ],
    edges: [
      { from: 'fetch_queue', to: 'scrape' },
      { from: 'scrape', to: 'perplexity_general' },
      { from: 'perplexity_general', to: 'perplexity_pricing' },
      { from: 'perplexity_pricing', to: 'perplexity_reviews' },
      { from: 'perplexity_reviews', to: 'perplexity_competitors' },
      { from: 'perplexity_competitors', to: 'consolidation' },
      { from: 'consolidation', to: 'store' },
      { from: 'store', to: 'scrape', label: 'next tool' },
    ],
  },

  async validate() {
    const errors = [];
    if (!process.env.ANTHROPIC_API_KEY) errors.push('Missing ANTHROPIC_API_KEY');
    if (!process.env.PERPLEXITY_API_KEY) errors.push('Missing PERPLEXITY_API_KEY');
    if (!process.env.SUPABASE_URL) errors.push('Missing SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_KEY) errors.push('Missing SUPABASE_SERVICE_KEY');
    return { valid: errors.length === 0, errors };
  },

  async execute(context) {
    const { executionId, toolId } = context;
    let processed = 0;
    let failed = 0;

    // Load configurable model settings
    const config = {
      mainModel: await getConfig('research_perplexity_main_model', 'sonar-pro'),
      targetedModel: await getConfig('research_perplexity_targeted_model', 'sonar'),
      consolidationModel: await getConfig('research_consolidation_model', 'claude-haiku-4-5-20250514'),
      consolidationProvider: await getConfig('research_consolidation_provider', 'anthropic'),
    };

    // Step 1: Fetch queue
    let query = supabase
      .from('tools')
      .select('id, name, slug, url, research_version')
      .eq('research_status', 'queued')
      .order('created_at', { ascending: true });

    if (toolId) {
      query = supabase
        .from('tools')
        .select('id, name, slug, url, research_version')
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
        await researchTool(tool, executionId, config, context);
        processed++;
      } catch (err) {
        console.error(`[research] Failed for ${tool.slug}:`, err.message);
        await logStep(executionId, `error_${tool.slug}`, 'failed', { error: err.message });
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

async function researchTool(tool, executionId, config, context) {
  console.log(`[research] Starting: ${tool.name} (${tool.url})`);
  const sourceTracker = createTracker();

  // Mark as researching
  await supabase
    .from('tools')
    .update({ research_status: 'researching', updated_at: new Date().toISOString() })
    .eq('id', tool.id);

  // Step 2: Multi-page scrape
  await logStep(executionId, `scrape_${tool.slug}`, 'started');
  let scrapeData;
  try {
    scrapeData = await scrapeWebsite(tool.url);
    sourceTracker.add(tool.url, 'scrape', { section: 'homepage' });
  } catch (err) {
    console.warn(`[research] Scrape failed for ${tool.slug}: ${err.message}`);
    scrapeData = {
      homepage: { title: '', description: '', h1s: [], meta: {}, error: err.message },
      pricing_page: { found: false },
      features_page: { found: false },
      about_page: { found: false },
      integrations_page: { found: false }
    };
  }
  await logStep(executionId, `scrape_${tool.slug}`, 'completed', {
    homepage: !!scrapeData.homepage?.title,
    pricing: scrapeData.pricing_page?.found || false,
    features: scrapeData.features_page?.found || false,
    about: scrapeData.about_page?.found || false,
    integrations: scrapeData.integrations_page?.found || false,
  });

  // Step 3: Perplexity General (sonar-pro)
  await logStep(executionId, `perplexity_general_${tool.slug}`, 'started');
  const generalQuery = prompts.buildGeneralPrompt(tool, scrapeData);
  const generalRes = await perplexity.ask({
    model: config.mainModel,
    system: prompts.PERPLEXITY_SYSTEM,
    messages: [{ role: 'user', content: generalQuery }],
    search_recency_filter: 'month'
  });
  const generalText = perplexity.getText(generalRes);
  const generalCitations = perplexity.getCitations(generalRes);
  sourceTracker.addCitations(generalCitations, 'general');
  await logStep(executionId, `perplexity_general_${tool.slug}`, 'completed', {
    chars: generalText.length, citations: generalCitations.length, model: config.mainModel
  });

  // Step 4: Perplexity Pricing (sonar)
  await logStep(executionId, `perplexity_pricing_${tool.slug}`, 'started');
  const pricingQuery = prompts.buildPricingPrompt(tool, scrapeData);
  const pricingRes = await perplexity.ask({
    model: config.targetedModel,
    system: prompts.PERPLEXITY_SYSTEM,
    messages: [{ role: 'user', content: pricingQuery }],
    search_recency_filter: 'month'
  });
  const pricingText = perplexity.getText(pricingRes);
  const pricingCitations = perplexity.getCitations(pricingRes);
  sourceTracker.addCitations(pricingCitations, 'pricing');
  await logStep(executionId, `perplexity_pricing_${tool.slug}`, 'completed', {
    chars: pricingText.length, citations: pricingCitations.length, model: config.targetedModel
  });

  // Step 5: Perplexity Reviews (sonar)
  await logStep(executionId, `perplexity_reviews_${tool.slug}`, 'started');
  const reviewsQuery = prompts.buildReviewsPrompt(tool);
  const reviewsRes = await perplexity.ask({
    model: config.targetedModel,
    system: prompts.PERPLEXITY_SYSTEM,
    messages: [{ role: 'user', content: reviewsQuery }],
    search_recency_filter: 'month'
  });
  const reviewsText = perplexity.getText(reviewsRes);
  const reviewsCitations = perplexity.getCitations(reviewsRes);
  sourceTracker.addCitations(reviewsCitations, 'reviews');
  await logStep(executionId, `perplexity_reviews_${tool.slug}`, 'completed', {
    chars: reviewsText.length, citations: reviewsCitations.length, model: config.targetedModel
  });

  // Step 6: Perplexity Competitors (sonar)
  await logStep(executionId, `perplexity_competitors_${tool.slug}`, 'started');
  const competitorsQuery = prompts.buildCompetitorsPrompt(tool, scrapeData);
  const competitorsRes = await perplexity.ask({
    model: config.targetedModel,
    system: prompts.PERPLEXITY_SYSTEM,
    messages: [{ role: 'user', content: competitorsQuery }],
    search_recency_filter: 'month'
  });
  const competitorsText = perplexity.getText(competitorsRes);
  const competitorsCitations = perplexity.getCitations(competitorsRes);
  sourceTracker.addCitations(competitorsCitations, 'competitors');
  await logStep(executionId, `perplexity_competitors_${tool.slug}`, 'completed', {
    chars: competitorsText.length, citations: competitorsCitations.length, model: config.targetedModel
  });

  // Step 7: Consolidation (Haiku)
  await logStep(executionId, `consolidation_${tool.slug}`, 'started');
  const perplexityResults = {
    general: { query: generalQuery, response: generalText, citations: generalCitations, model: config.mainModel },
    pricing: { query: pricingQuery, response: pricingText, citations: pricingCitations, model: config.targetedModel },
    reviews: { query: reviewsQuery, response: reviewsText, citations: reviewsCitations, model: config.targetedModel },
    competitors: { query: competitorsQuery, response: competitorsText, citations: competitorsCitations, model: config.targetedModel }
  };

  const consolidationPrompt = prompts.buildConsolidationPrompt(tool, scrapeData, perplexityResults);
  const consolidationRes = await ask(config.consolidationProvider, {
    model: config.consolidationModel,
    system: 'You are a research analyst. Cross-reference data from multiple sources and identify gaps. Output ONLY valid JSON.',
    messages: [{ role: 'user', content: consolidationPrompt }],
    max_tokens: 4096,
    temperature: 0.2
  });

  let consolidationText;
  if (config.consolidationProvider === 'anthropic') {
    const anthropic = require('../../shared/clients/anthropic');
    consolidationText = anthropic.getText(consolidationRes);
  } else {
    const openai = require('../../shared/clients/openai');
    consolidationText = openai.getText(consolidationRes);
  }

  let consolidation;
  try {
    const jsonMatch = consolidationText.match(/\{[\s\S]*\}/);
    consolidation = jsonMatch ? JSON.parse(jsonMatch[0]) : { notes: 'Parse failed' };
  } catch {
    consolidation = { notes: 'JSON parse failed', raw: consolidationText.slice(0, 500) };
  }

  await logStep(executionId, `consolidation_${tool.slug}`, 'completed', {
    gaps: consolidation.gaps?.length || 0, model: config.consolidationModel
  });

  // Step 8: Store raw_research + trigger Analyst
  await logStep(executionId, `store_${tool.slug}`, 'started');

  const rawResearch = {
    version: (tool.research_version || 0) + 1,
    collected_at: new Date().toISOString(),
    scrape: scrapeData,
    perplexity_general: perplexityResults.general,
    perplexity_pricing: perplexityResults.pricing,
    perplexity_reviews: perplexityResults.reviews,
    perplexity_competitors: perplexityResults.competitors,
    consolidation: {
      response: consolidation,
      gaps: consolidation.gaps || [],
      contradictions: consolidation.contradictions || [],
      model: config.consolidationModel
    }
  };

  // Backward compat: update website_data with homepage info
  const websiteData = {
    url: tool.url,
    logo: scrapeData.homepage?.meta?.logo || `https://www.google.com/s2/favicons?domain=${new URL(tool.url).hostname}&sz=128`,
    name: scrapeData.homepage?.meta?.site_name || tool.name,
    pageTitle: scrapeData.homepage?.title || '',
    description: scrapeData.homepage?.description || '',
    hasPricingPage: scrapeData.pricing_page?.found || false,
    scrapedAt: new Date().toISOString()
  };

  const { error: updateError } = await supabase
    .from('tools')
    .update({
      raw_research: rawResearch,
      research_sources: sourceTracker.toArray(),
      research_version: rawResearch.version,
      research_gaps: consolidation.gaps || [],
      website_data: websiteData,
      research_blob: generalText,
      research_status: 'researched',
      analysis_status: 'queued',
      updated_at: new Date().toISOString()
    })
    .eq('id', tool.id);

  if (updateError) throw new Error(`Failed to update tool: ${updateError.message}`);

  await logStep(executionId, `store_${tool.slug}`, 'completed', {
    sources: sourceTracker.count,
    research_version: rawResearch.version
  });

  console.log(`[research] Completed: ${tool.name} → researched (${sourceTracker.count} sources)`);

  // Chain to Analyst Agent
  await triggerAnalyst(tool, executionId, context);
}

/**
 * Trigger the Analyst Agent for this tool via the automations registry.
 */
async function triggerAnalyst(tool, executionId, context) {
  const automations = context.automations || [];
  const analyst = automations.find(a => a.id === 'agents/analyst');

  if (!analyst) {
    console.log(`[research] Analyst agent not discovered — skipping analysis chain for ${tool.name}`);
    return;
  }

  console.log(`[research] Triggering Analyst Agent for ${tool.name}`);

  try {
    const analystExec = await createExecution('agents/analyst');

    // Fire and forget — analyst runs async after research completes
    analyst._module.execute({
      executionId: analystExec.id,
      trigger: 'agent-chain',
      runtime: 'railway',
      toolId: tool.id,
      sourceExecutionId: executionId,
      automations: context.automations
    }).then(result => {
      completeExecution(analystExec.id, 'success', null, result);
      console.log(`[research] Analyst completed for ${tool.name}`);
    }).catch(err => {
      completeExecution(analystExec.id, 'failure', err.message);
      console.error(`[research] Analyst failed for ${tool.name}:`, err.message);
    });
  } catch (err) {
    console.error(`[research] Failed to trigger analyst for ${tool.name}:`, err.message);
  }
}
