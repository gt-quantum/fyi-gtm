/**
 * Research Agent — Comprehensive Data Gathering
 *
 * Pipeline: Fetch queue → Multi-page scrape (sitemap, JSON-LD, AI discovery)
 * → 6 Perplexity searches (general → parallel: pricing/reviews/competitors/company/community)
 * → Haiku consolidation → Quality gate → Store + trigger Analyst.
 *
 * Writes raw_research JSONB, research_sources, sets research_status='researched'.
 * Chains to Analyst Agent for structuring (if quality gate passes).
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
  description: 'Comprehensive data gathering: scrapes websites (sitemap, JSON-LD, AI page discovery), runs 6 targeted web searches, consolidates findings with quality gate',
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
    perplexity_company: 'Company sources — LinkedIn, Crunchbase, YC, AngelList profiles',
    perplexity_community: 'Community presence — Product Hunt, HN, Reddit, press coverage',
    consolidation: 'Cross-reference all sources, identify contradictions, flag gaps, assess completeness',
  },

  operationalParams: {
    perplexity_main_model: 'sonar-pro (configurable: research_perplexity_main_model)',
    perplexity_targeted_model: 'sonar (configurable: research_perplexity_targeted_model)',
    consolidation_model: 'claude-haiku-4-5 (configurable: research_consolidation_model)',
    consolidation_provider: 'anthropic (configurable: research_consolidation_provider)',
    ai_discovery_model: 'claude-haiku-4-5 (configurable: research_consolidation_model)',
    search_recency_filter: 'month',
    max_pages_scraped: '8 (homepage + pricing/features/about/integrations/changelog/blog)',
    scrape_timeout: '20s per page',
    queries: '6 (general sonar-pro + 5x sonar parallel)',
  },

  flow: {
    triggers: ['agents/analyst'],
    steps: [
      { id: 'fetch_queue', label: 'Fetch Queued Tools', type: 'action', icon: 'database' },
      { id: 'scrape', label: 'Multi-Page Scrape', type: 'action', icon: 'globe' },
      { id: 'perplexity_general', label: 'Perplexity: General', type: 'ai', icon: 'sparkle' },
      { id: 'perplexity_targeted', label: 'Perplexity: 5x Parallel', type: 'ai', icon: 'sparkle' },
      { id: 'consolidation', label: 'Consolidation', type: 'ai', icon: 'sparkle' },
      { id: 'quality_gate', label: 'Quality Gate', type: 'action', icon: 'check' },
      { id: 'store', label: 'Store + Trigger Analyst', type: 'output', icon: 'check' },
    ],
    edges: [
      { from: 'fetch_queue', to: 'scrape' },
      { from: 'scrape', to: 'perplexity_general' },
      { from: 'perplexity_general', to: 'perplexity_targeted' },
      { from: 'perplexity_targeted', to: 'consolidation' },
      { from: 'consolidation', to: 'quality_gate' },
      { from: 'quality_gate', to: 'store' },
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

    // Load model settings from config.settings (no hardcoded defaults)
    const config = {
      mainModel: await getConfig('research_perplexity_main_model'),
      targetedModel: await getConfig('research_perplexity_targeted_model'),
      consolidationModel: await getConfig('research_consolidation_model'),
      consolidationProvider: await getConfig('research_consolidation_provider'),
    };
    const missingConfig = Object.entries(config).filter(([, v]) => !v).map(([k]) => k);
    if (missingConfig.length) throw new Error(`Missing config.settings: ${missingConfig.join(', ')}`);

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

  // Step 2: Multi-page scrape (with AI page discovery)
  await logStep(executionId, `scrape_${tool.slug}`, 'started');
  let scrapeData;
  try {
    scrapeData = await scrapeWebsite(tool.url, {
      aiRouter: ask,
      aiModel: config.consolidationModel, // Use Haiku for AI page discovery
    });
    sourceTracker.add(tool.url, 'scrape', { section: 'homepage' });
    // Track scraped subpages
    for (const [pageType, pageData] of Object.entries(scrapeData)) {
      if (pageData && pageData.found) {
        sourceTracker.add(tool.url, 'scrape', { section: pageType });
      }
    }
  } catch (err) {
    console.warn(`[research] Scrape failed for ${tool.slug}: ${err.message}`);
    scrapeData = {
      homepage: { title: '', description: '', h1s: [], meta: {}, error: err.message, error_type: 'exception' },
      json_ld: [],
      sitemap_urls: [],
      pricing_page: { found: false },
      features_page: { found: false },
      about_page: { found: false },
      integrations_page: { found: false },
      changelog_page: { found: false },
      blog_page: { found: false },
    };
  }
  await logStep(executionId, `scrape_${tool.slug}`, 'completed', {
    homepage: !!scrapeData.homepage?.title,
    json_ld: scrapeData.json_ld?.length || 0,
    sitemap_urls: scrapeData.sitemap_urls?.length || 0,
    pricing: scrapeData.pricing_page?.found || false,
    features: scrapeData.features_page?.found || false,
    about: scrapeData.about_page?.found || false,
    integrations: scrapeData.integrations_page?.found || false,
    changelog: scrapeData.changelog_page?.found || false,
    blog: scrapeData.blog_page?.found || false,
  });

  // Step 3: Perplexity General (sonar-pro) — runs first to provide context
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
  const generalInsufficient = generalText.toUpperCase().includes('INSUFFICIENT_DATA');
  sourceTracker.addCitations(generalCitations, 'general');
  await logStep(executionId, `perplexity_general_${tool.slug}`, 'completed', {
    chars: generalText.length, citations: generalCitations.length,
    model: config.mainModel, insufficient: generalInsufficient
  });

  // Cross-prompt context: truncated general response for targeted queries
  const generalContext = generalText.slice(0, 1500);

  // Step 4: 5x Parallel targeted queries (sonar)
  await logStep(executionId, `perplexity_targeted_${tool.slug}`, 'started');

  const pricingQuery = prompts.buildPricingPrompt(tool, scrapeData, generalContext);
  const reviewsQuery = prompts.buildReviewsPrompt(tool, scrapeData, generalContext);
  const competitorsQuery = prompts.buildCompetitorsPrompt(tool, scrapeData, generalContext);
  const companyQuery = prompts.buildCompanySourcesPrompt(tool, scrapeData, generalContext);
  const communityQuery = prompts.buildCommunityPresencePrompt(tool, scrapeData, generalContext);

  const targetedParams = { system: prompts.PERPLEXITY_SYSTEM, search_recency_filter: 'month' };

  const [pricingRes, reviewsRes, competitorsRes, companyRes, communityRes] = await Promise.all([
    perplexity.ask({ ...targetedParams, model: config.targetedModel, messages: [{ role: 'user', content: pricingQuery }] }),
    perplexity.ask({ ...targetedParams, model: config.targetedModel, messages: [{ role: 'user', content: reviewsQuery }] }),
    perplexity.ask({ ...targetedParams, model: config.targetedModel, messages: [{ role: 'user', content: competitorsQuery }] }),
    perplexity.ask({ ...targetedParams, model: config.targetedModel, messages: [{ role: 'user', content: companyQuery }] }),
    perplexity.ask({ ...targetedParams, model: config.targetedModel, messages: [{ role: 'user', content: communityQuery }] }),
  ]);

  const pricingText = perplexity.getText(pricingRes);
  const pricingCitations = perplexity.getCitations(pricingRes);
  const pricingInsufficient = pricingText.toUpperCase().includes('INSUFFICIENT_DATA');
  sourceTracker.addCitations(pricingCitations, 'pricing');

  const reviewsText = perplexity.getText(reviewsRes);
  const reviewsCitations = perplexity.getCitations(reviewsRes);
  const reviewsInsufficient = reviewsText.toUpperCase().includes('INSUFFICIENT_DATA');
  sourceTracker.addCitations(reviewsCitations, 'reviews');

  const competitorsText = perplexity.getText(competitorsRes);
  const competitorsCitations = perplexity.getCitations(competitorsRes);
  const competitorsInsufficient = competitorsText.toUpperCase().includes('INSUFFICIENT_DATA');
  sourceTracker.addCitations(competitorsCitations, 'competitors');

  const companyText = perplexity.getText(companyRes);
  const companyCitations = perplexity.getCitations(companyRes);
  const companyInsufficient = companyText.toUpperCase().includes('INSUFFICIENT_DATA');
  sourceTracker.addCitations(companyCitations, 'company');

  const communityText = perplexity.getText(communityRes);
  const communityCitations = perplexity.getCitations(communityRes);
  const communityInsufficient = communityText.toUpperCase().includes('INSUFFICIENT_DATA');
  sourceTracker.addCitations(communityCitations, 'community');

  // Citation relevance filtering
  const toolDomain = (() => { try { return new URL(tool.url).hostname.replace('www.', ''); } catch { return ''; } })();
  const relevantDomains = [toolDomain, 'g2.com', 'capterra.com', 'trustradius.com', 'crunchbase.com',
    'linkedin.com', 'producthunt.com', 'reddit.com', 'news.ycombinator.com', 'techcrunch.com',
    'venturebeat.com', 'wellfound.com', 'ycombinator.com'];

  function computeCitationRelevance(citations) {
    if (!citations || citations.length === 0) return 1;
    const relevant = citations.filter(c => {
      try {
        const host = new URL(c).hostname.replace('www.', '');
        return relevantDomains.some(d => host.includes(d));
      } catch { return false; }
    });
    return relevant.length / citations.length;
  }

  const reviewsCitationRelevance = computeCitationRelevance(reviewsCitations);

  await logStep(executionId, `perplexity_targeted_${tool.slug}`, 'completed', {
    pricing: { chars: pricingText.length, citations: pricingCitations.length, insufficient: pricingInsufficient },
    reviews: { chars: reviewsText.length, citations: reviewsCitations.length, insufficient: reviewsInsufficient, citationRelevance: reviewsCitationRelevance },
    competitors: { chars: competitorsText.length, citations: competitorsCitations.length, insufficient: competitorsInsufficient },
    company: { chars: companyText.length, citations: companyCitations.length, insufficient: companyInsufficient },
    community: { chars: communityText.length, citations: communityCitations.length, insufficient: communityInsufficient },
    model: config.targetedModel
  });

  // Step 5: Consolidation (Haiku)
  await logStep(executionId, `consolidation_${tool.slug}`, 'started');
  const perplexityResults = {
    general: { query: generalQuery, response: generalText, citations: generalCitations, model: config.mainModel, insufficient: generalInsufficient },
    pricing: { query: pricingQuery, response: pricingText, citations: pricingCitations, model: config.targetedModel, insufficient: pricingInsufficient },
    reviews: { query: reviewsQuery, response: reviewsText, citations: reviewsCitations, model: config.targetedModel, insufficient: reviewsInsufficient, citation_relevance: reviewsCitationRelevance },
    competitors: { query: competitorsQuery, response: competitorsText, citations: competitorsCitations, model: config.targetedModel, insufficient: competitorsInsufficient },
    company: { query: companyQuery, response: companyText, citations: companyCitations, model: config.targetedModel, insufficient: companyInsufficient },
    community: { query: communityQuery, response: communityText, citations: communityCitations, model: config.targetedModel, insufficient: communityInsufficient },
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

  // Step 6: Quality Gate — check if we have enough reliable data
  await logStep(executionId, `quality_gate_${tool.slug}`, 'started');

  const scraperWorked = !scrapeData.homepage?.error;
  const generalNotInsufficient = !generalInsufficient;
  const overallCitationRelevance = computeCitationRelevance([
    ...generalCitations, ...pricingCitations, ...reviewsCitations,
    ...competitorsCitations, ...companyCitations, ...communityCitations
  ]);
  const relevantCitations = overallCitationRelevance > 0.3;
  const insufficientCount = [generalInsufficient, pricingInsufficient, reviewsInsufficient,
    competitorsInsufficient, companyInsufficient, communityInsufficient].filter(Boolean).length;

  const qualityChecks = { scraperWorked, generalNotInsufficient, relevantCitations };
  const passedChecks = Object.values(qualityChecks).filter(Boolean).length;
  const qualityPassed = passedChecks >= 2;

  await logStep(executionId, `quality_gate_${tool.slug}`, 'completed', {
    passed: qualityPassed, checks: qualityChecks, insufficientCount,
    citationRelevance: overallCitationRelevance
  });

  // Step 7: Store raw_research
  await logStep(executionId, `store_${tool.slug}`, 'started');

  const rawResearch = {
    version: (tool.research_version || 0) + 1,
    collected_at: new Date().toISOString(),
    scrape: scrapeData,
    perplexity_general: perplexityResults.general,
    perplexity_pricing: perplexityResults.pricing,
    perplexity_reviews: perplexityResults.reviews,
    perplexity_competitors: perplexityResults.competitors,
    perplexity_company: perplexityResults.company,
    perplexity_community: perplexityResults.community,
    consolidation: {
      response: consolidation,
      gaps: consolidation.gaps || [],
      contradictions: consolidation.contradictions || [],
      insufficient_queries: consolidation.insufficient_queries || [],
      source_quality: consolidation.source_quality || {},
      model: config.consolidationModel
    },
    quality_gate: {
      passed: qualityPassed,
      checks: qualityChecks,
      insufficient_count: insufficientCount,
      citation_relevance: overallCitationRelevance,
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
    hasJsonLd: (scrapeData.json_ld?.length || 0) > 0,
    sitemapUrls: scrapeData.sitemap_urls?.length || 0,
    scrapedAt: new Date().toISOString()
  };

  // screenshot_url: OG image priority → Google favicon fallback
  const screenshotUrl = scrapeData.homepage?.meta?.og_image
    || `https://www.google.com/s2/favicons?domain=${new URL(tool.url).hostname}&sz=128`;

  const updatePayload = {
    raw_research: rawResearch,
    research_sources: sourceTracker.toArray(),
    research_version: rawResearch.version,
    research_gaps: consolidation.gaps || [],
    website_data: websiteData,
    research_blob: generalText,
    screenshot_url: screenshotUrl,
    updated_at: new Date().toISOString()
  };

  if (qualityPassed) {
    updatePayload.research_status = 'researched';
    updatePayload.analysis_status = 'queued';
  } else {
    // Quality gate failed — don't auto-trigger analyst
    updatePayload.research_status = 'researched';
    updatePayload.analysis_status = 'needs_review';
    updatePayload.research_gaps = [
      ...(consolidation.gaps || []),
      `QUALITY_GATE: Research data insufficient for automated analysis (passed ${passedChecks}/3 checks)`
    ];
    console.log(`[research] Quality gate FAILED for ${tool.name} — skipping analyst auto-trigger`);
  }

  const { error: updateError } = await supabase
    .from('tools')
    .update(updatePayload)
    .eq('id', tool.id);

  if (updateError) throw new Error(`Failed to update tool: ${updateError.message}`);

  await logStep(executionId, `store_${tool.slug}`, 'completed', {
    sources: sourceTracker.count,
    research_version: rawResearch.version,
    quality_gate: qualityPassed ? 'passed' : 'failed'
  });

  console.log(`[research] Completed: ${tool.name} → researched (${sourceTracker.count} sources, quality: ${qualityPassed ? 'PASS' : 'FAIL'})`);

  // Chain to Analyst Agent (only if quality gate passed)
  if (qualityPassed) {
    await triggerAnalyst(tool, executionId, context);
  }
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
