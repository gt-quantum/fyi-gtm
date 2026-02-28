/**
 * Analyst Agent — Structuring, Classification & Validation
 *
 * Pipeline: Load tool + raw_research → GPT-4.1-mini extraction (features, sentiment,
 * pricing, competitors, company) → Haiku classification + summary → Validate + score → Store.
 *
 * Reads raw_research JSONB, writes all structured fields to tools table.
 * Sets research_status='complete', analysis_status='complete'.
 */
const { supabase } = require('../../shared/clients/supabase');
const { logStep } = require('../../shared/database/queries');
const { getConfig } = require('../../shared/clients/config');
const { extractFeatures, extractSentiment, extractPricing, extractCompetitors, extractCompanyInfo } = require('./extractors');
const { classify, generateSummary } = require('./classifier');
const { computeConfidence, validateExtracted, detectHallucinations, applyHallucinationFixes } = require('./validator');

module.exports = {
  name: 'Analyst Agent',
  description: 'Structures raw research into taxonomy-classified fields: features, sentiment, pricing, competitors, company info, and confidence scores',
  type: 'agent',
  schedule: 'triggered',
  enabled: true,
  tags: ['analyst', 'tools', 'structuring'],
  runtime: 'railway',

  prompts: {
    extract_features: 'Extract 5-10 key features with category/differentiator flags, 3-6 use cases with persona, recent developments',
    extract_sentiment: 'Extract pros/cons with categories, praise/complaint themes with frequency, notable user quotes with source',
    extract_pricing: 'Structure pricing tiers with exact amounts, model type, free trial details, contract terms',
    extract_competitors: 'Map 3-8 competitors as direct/indirect/adjacent with differentiators and weaknesses',
    extract_company: 'Extract founding year, HQ, employee count, key people, funding rounds, notable customers',
    classify_taxonomy: 'Assign primary_category (20 options), group_name (6 options), pricing tier, company_size, ai_automation, tags',
    generate_summary: '1-2 sentence summary + "Best for [persona] who need [capability]" statement',
  },

  operationalParams: {
    extraction_model: 'gpt-4.1-mini (configurable: analyst_extraction_model)',
    extraction_provider: 'openai (configurable: analyst_extraction_provider)',
    classification_model: 'claude-haiku-4-5 (configurable: analyst_classification_model)',
    classification_provider: 'anthropic (configurable: analyst_classification_provider)',
    summary_model: 'claude-haiku-4-5 (configurable: analyst_summary_model)',
    summary_provider: 'anthropic (configurable: analyst_summary_provider)',
    extraction_temperature: '0.2',
    classification_temperature: '0.1',
    summary_temperature: '0.3',
  },

  flow: {
    triggeredBy: ['agents/research'],
    steps: [
      { id: 'fetch_tool', label: 'Fetch Tool + Raw Research', type: 'action', icon: 'database' },
      { id: 'extract_features', label: 'Extract Features', type: 'ai', icon: 'sparkle' },
      { id: 'extract_sentiment', label: 'Extract Sentiment', type: 'ai', icon: 'sparkle' },
      { id: 'extract_pricing', label: 'Structure Pricing', type: 'ai', icon: 'sparkle' },
      { id: 'extract_competitors', label: 'Map Competitors', type: 'ai', icon: 'sparkle' },
      { id: 'extract_company', label: 'Extract Company Info', type: 'ai', icon: 'sparkle' },
      { id: 'classify', label: 'Classify (Taxonomy)', type: 'ai', icon: 'sparkle' },
      { id: 'summarize', label: 'Generate Summary', type: 'ai', icon: 'sparkle' },
      { id: 'validate', label: 'Validate & Score', type: 'action', icon: 'check' },
      { id: 'update', label: 'Update Tool Record', type: 'output', icon: 'check' },
    ],
    edges: [
      { from: 'fetch_tool', to: 'extract_features' },
      { from: 'extract_features', to: 'extract_sentiment' },
      { from: 'extract_sentiment', to: 'extract_pricing' },
      { from: 'extract_pricing', to: 'extract_competitors' },
      { from: 'extract_competitors', to: 'extract_company' },
      { from: 'extract_company', to: 'classify' },
      { from: 'classify', to: 'summarize' },
      { from: 'summarize', to: 'validate' },
      { from: 'validate', to: 'update' },
    ],
  },

  async validate() {
    const errors = [];
    if (!process.env.OPENAI_API_KEY) errors.push('Missing OPENAI_API_KEY');
    if (!process.env.ANTHROPIC_API_KEY) errors.push('Missing ANTHROPIC_API_KEY');
    if (!process.env.SUPABASE_URL) errors.push('Missing SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_KEY) errors.push('Missing SUPABASE_SERVICE_KEY');
    return { valid: errors.length === 0, errors };
  },

  async execute(context) {
    const { executionId, toolId } = context;

    // Load model settings from config.settings (no hardcoded defaults)
    const config = {
      extractionModel: await getConfig('analyst_extraction_model'),
      extractionProvider: await getConfig('analyst_extraction_provider'),
      classificationModel: await getConfig('analyst_classification_model'),
      classificationProvider: await getConfig('analyst_classification_provider'),
      summaryModel: await getConfig('analyst_summary_model'),
      summaryProvider: await getConfig('analyst_summary_provider'),
    };
    const missingConfig = Object.entries(config).filter(([, v]) => !v).map(([k]) => k);
    if (missingConfig.length) throw new Error(`Missing config.settings: ${missingConfig.join(', ')}`);

    // Step 1: Fetch tool with raw_research
    await logStep(executionId, 'fetch_tool', 'started');

    let query = supabase
      .from('tools')
      .select('id, name, slug, url, raw_research, research_version')
      .eq('analysis_status', 'queued')
      .order('updated_at', { ascending: true })
      .limit(1);

    if (toolId) {
      query = supabase
        .from('tools')
        .select('id, name, slug, url, raw_research, research_version')
        .eq('id', toolId);
    }

    const { data: tools, error: fetchError } = await query;
    if (fetchError) throw new Error(`Failed to fetch tool: ${fetchError.message}`);

    if (!tools || tools.length === 0) {
      await logStep(executionId, 'fetch_tool', 'completed', { message: 'No tools queued for analysis' });
      return { processed: 0 };
    }

    const tool = tools[0];

    if (!tool.raw_research || !tool.raw_research.perplexity_general) {
      await logStep(executionId, 'fetch_tool', 'failed', { error: 'No raw_research data — run Research Agent first' });
      await supabase
        .from('tools')
        .update({ analysis_status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', tool.id);
      return { processed: 0, failed: 1, error: 'No raw_research' };
    }

    await supabase
      .from('tools')
      .update({ analysis_status: 'analyzing', research_status: 'analyzing', updated_at: new Date().toISOString() })
      .eq('id', tool.id);

    await logStep(executionId, 'fetch_tool', 'completed', {
      tool: tool.name, research_version: tool.research_version
    });

    console.log(`[analyst] Starting analysis: ${tool.name}`);

    try {
      const result = await analyzeTool(tool, executionId, config);
      return { processed: 1, tool: tool.name, ...result };
    } catch (err) {
      console.error(`[analyst] Failed for ${tool.slug}:`, err.message);
      await logStep(executionId, `error_${tool.slug}`, 'failed', { error: err.message });
      await supabase
        .from('tools')
        .update({ analysis_status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', tool.id);
      return { processed: 0, failed: 1, error: err.message };
    }
  }
};

// ----------------------------------------------------------------
// Core analysis pipeline for a single tool
// ----------------------------------------------------------------

async function analyzeTool(tool, executionId, config) {
  const rawResearch = tool.raw_research;
  const ep = config.extractionProvider;
  const em = config.extractionModel;

  // Step 2: Extract features, use cases, recent developments
  await logStep(executionId, 'extract_features', 'started');
  const featuresData = await extractFeatures(tool.name, rawResearch, ep, em);
  await logStep(executionId, 'extract_features', 'completed', {
    features: featuresData.key_features.length,
    use_cases: featuresData.use_cases.length,
    model: em
  });

  // Step 3: Extract sentiment, pros/cons, ratings
  await logStep(executionId, 'extract_sentiment', 'started');
  const sentimentData = await extractSentiment(tool.name, rawResearch, ep, em);
  await logStep(executionId, 'extract_sentiment', 'completed', {
    pros: sentimentData.pros_cons.pros?.length || 0,
    cons: sentimentData.pros_cons.cons?.length || 0,
    model: em
  });

  // Step 4: Structure pricing
  await logStep(executionId, 'extract_pricing', 'started');
  const pricingData = await extractPricing(tool.name, rawResearch, ep, em);
  await logStep(executionId, 'extract_pricing', 'completed', {
    tiers: pricingData.pricing_info.tiers?.length || 0,
    model: em
  });

  // Step 5: Map competitors
  await logStep(executionId, 'extract_competitors', 'started');
  const competitorData = await extractCompetitors(tool.name, rawResearch, ep, em);
  await logStep(executionId, 'extract_competitors', 'completed', {
    competitors: competitorData.competitors.length,
    model: em
  });

  // Step 6: Extract company info
  await logStep(executionId, 'extract_company', 'started');
  const companyData = await extractCompanyInfo(tool.name, rawResearch, ep, em);
  await logStep(executionId, 'extract_company', 'completed', {
    has_funding: !!companyData.company_info.funding?.total,
    model: em
  });

  // Step 7: Classify (taxonomy)
  await logStep(executionId, 'classify', 'started');
  const classification = await classify(
    tool.name, tool.url, rawResearch,
    featuresData, pricingData,
    config.classificationProvider, config.classificationModel
  );
  await logStep(executionId, 'classify', 'completed', {
    primary_category: classification.primary_category,
    tags: classification.tags.length,
    model: config.classificationModel
  });

  // Step 8: Generate summary
  await logStep(executionId, 'summarize', 'started');
  const summaryData = await generateSummary(
    tool.name, tool.url, rawResearch, featuresData,
    config.summaryProvider, config.summaryModel
  );
  await logStep(executionId, 'summarize', 'completed', {
    summary_length: summaryData.summary?.length || 0,
    model: config.summaryModel
  });

  // Step 9: Validate, detect hallucinations & score (code only)
  await logStep(executionId, 'validate', 'started');

  let allExtracted = {
    ...featuresData,
    ...sentimentData,
    ...pricingData,
    ...competitorData,
    ...companyData,
    ...classification,
    ...summaryData
  };

  // Hallucination detection
  const { flags: hallucinationFlags, hasCritical } = detectHallucinations(rawResearch, allExtracted);
  if (hasCritical) {
    console.warn(`[analyst] CRITICAL hallucination flags for ${tool.name}: ${hallucinationFlags.filter(f => f.severity === 'critical').map(f => f.type).join(', ')}`);
    allExtracted = applyHallucinationFixes(allExtracted, hallucinationFlags);
  }

  // Source-weighted confidence scoring (with hallucination flags)
  const { confidence_scores, research_gaps } = computeConfidence(rawResearch, allExtracted, hallucinationFlags);
  const warnings = validateExtracted(allExtracted);

  // Determine analysis status based on confidence
  const analysisStatus = confidence_scores.overall < 0.3 ? 'needs_review' : 'complete';

  await logStep(executionId, 'validate', 'completed', {
    overall_confidence: confidence_scores.overall,
    analysis_status: analysisStatus,
    hallucination_flags: hallucinationFlags.length,
    critical_flags: hasCritical,
    gaps: research_gaps.length,
    warnings: warnings.length
  });

  // Step 10: Update tool record with all structured fields
  await logStep(executionId, 'update', 'started');

  const updatePayload = {
    // Extracted structured data
    key_features: allExtracted.key_features,
    use_cases: allExtracted.use_cases,
    recent_developments: allExtracted.recent_developments,
    pros_cons: allExtracted.pros_cons,
    user_sentiment: allExtracted.user_sentiment,
    ratings: allExtracted.ratings,
    pricing_info: allExtracted.pricing_info,
    competitors: allExtracted.competitors,
    company_info: allExtracted.company_info,

    // Classification
    summary: allExtracted.summary,
    best_for: allExtracted.best_for || null,
    category: allExtracted.category,
    primary_category: allExtracted.primary_category,
    categories: allExtracted.categories,
    group_name: allExtracted.group_name,
    tags: allExtracted.tags,
    pricing: allExtracted.pricing,
    price_note: allExtracted.price_note,
    pricing_tags: allExtracted.pricing_tags,
    company_size: allExtracted.company_size,
    ai_automation: allExtracted.ai_automation,
    integrations: allExtracted.integrations,

    // Confidence & gaps
    confidence_scores,
    research_gaps,

    // Status — uses needs_review if confidence is too low
    research_status: 'complete',
    analysis_status: analysisStatus,
    analysis_completed_at: new Date().toISOString(),
    research_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error: updateError } = await supabase
    .from('tools')
    .update(updatePayload)
    .eq('id', tool.id);

  if (updateError) throw new Error(`Failed to update tool: ${updateError.message}`);

  await logStep(executionId, 'update', 'completed', {
    fields_updated: Object.keys(updatePayload).length,
    overall_confidence: confidence_scores.overall
  });

  console.log(`[analyst] Completed: ${tool.name} → ${allExtracted.primary_category} (confidence: ${confidence_scores.overall}, status: ${analysisStatus})`);

  return {
    primary_category: allExtracted.primary_category,
    confidence: confidence_scores.overall,
    analysis_status: analysisStatus,
    hallucination_flags: hallucinationFlags.length,
    gaps: research_gaps.length,
    warnings
  };
}
