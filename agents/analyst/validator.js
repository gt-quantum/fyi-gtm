/**
 * Analyst Agent — Validation and confidence scoring.
 * Validates extracted data schemas and computes per-field confidence scores.
 */

/**
 * Compute confidence scores for each extracted field.
 *
 * Scoring rules:
 * - Base: 0.5
 * - +0.2 if data from official website scrape
 * - +0.15 if corroborated by Perplexity research
 * - +0.05 per additional source (max +0.15)
 * - -0.2 if estimated/unverified
 * - -0.1 if single source only
 *
 * @param {Object} rawResearch - The raw_research JSONB
 * @param {Object} extracted - All extracted data (features, sentiment, pricing, etc.)
 * @returns {{ confidence_scores, research_gaps }}
 */
function computeConfidence(rawResearch, extracted) {
  const scrape = rawResearch.scrape || {};
  const consolidation = rawResearch.consolidation?.response || {};
  const completeness = consolidation.completeness || {};

  const scores = {};
  const gaps = [];

  // Key features
  scores.key_features = scoreField(
    extracted.key_features,
    { hasArray: true, minItems: 3 },
    scrape.features_page?.found,
    !!rawResearch.perplexity_general?.response,
    completeness.features
  );
  if (scores.key_features < 0.5) gaps.push('key_features: insufficient feature data');

  // Pricing info
  scores.pricing_info = scoreField(
    extracted.pricing_info,
    { hasObject: true, requiredKeys: ['model'] },
    scrape.pricing_page?.found,
    !!rawResearch.perplexity_pricing?.response,
    completeness.pricing
  );
  if (scores.pricing_info < 0.5) gaps.push('pricing_info: pricing data incomplete or unavailable');

  // User sentiment
  scores.user_sentiment = scoreField(
    extracted.user_sentiment,
    { hasObject: true, requiredKeys: ['overall_sentiment'] },
    false,
    !!rawResearch.perplexity_reviews?.response,
    completeness.reviews
  );
  if (scores.user_sentiment < 0.5) gaps.push('user_sentiment: limited review data');

  // Competitors
  scores.competitors = scoreField(
    extracted.competitors,
    { hasArray: true, minItems: 2 },
    false,
    !!rawResearch.perplexity_competitors?.response,
    completeness.competitors
  );
  if (scores.competitors < 0.5) gaps.push('competitors: insufficient competitive data');

  // Company info
  scores.company_info = scoreField(
    extracted.company_info,
    { hasObject: true, requiredKeys: ['founded_year'] },
    scrape.about_page?.found,
    !!rawResearch.perplexity_general?.response,
    completeness.company_info
  );
  if (scores.company_info < 0.5) gaps.push('company_info: limited company information');

  // Classification (based on how much data was available for classification)
  const classificationSources = [
    rawResearch.perplexity_general?.response,
    scrape.homepage?.description,
    extracted.key_features?.length > 0
  ].filter(Boolean).length;
  scores.classification = Math.min(1.0, 0.5 + (classificationSources * 0.15));

  // Pros/cons
  const prosCount = extracted.pros_cons?.pros?.length || 0;
  const consCount = extracted.pros_cons?.cons?.length || 0;
  scores.pros_cons = Math.min(1.0, 0.4 + (Math.min(prosCount, 5) * 0.06) + (Math.min(consCount, 5) * 0.06));

  // Use cases
  const useCaseCount = extracted.use_cases?.length || 0;
  scores.use_cases = Math.min(1.0, 0.4 + (Math.min(useCaseCount, 6) * 0.1));

  // Overall
  const fieldScores = Object.values(scores);
  scores.overall = parseFloat((fieldScores.reduce((a, b) => a + b, 0) / fieldScores.length).toFixed(2));

  // Round all scores
  for (const key of Object.keys(scores)) {
    scores[key] = parseFloat(scores[key].toFixed(2));
  }

  // Add consolidation gaps
  if (consolidation.gaps) {
    for (const gap of consolidation.gaps) {
      if (!gaps.includes(gap)) gaps.push(gap);
    }
  }

  return { confidence_scores: scores, research_gaps: gaps };
}

/**
 * Score a single field based on data quality signals.
 */
function scoreField(data, checks, hasScrapeSrc, hasPerplexitySrc, completenessLevel) {
  let score = 0.5;

  // Check if data exists and meets minimum requirements
  if (checks.hasArray) {
    if (!Array.isArray(data) || data.length === 0) return 0.2;
    if (data.length < (checks.minItems || 1)) score -= 0.1;
  }
  if (checks.hasObject) {
    if (!data || typeof data !== 'object') return 0.2;
    if (checks.requiredKeys) {
      const missing = checks.requiredKeys.filter(k => data[k] == null);
      if (missing.length > 0) score -= 0.1;
    }
  }

  // Source bonuses
  if (hasScrapeSrc) score += 0.2;
  if (hasPerplexitySrc) score += 0.15;

  // Completeness level from consolidation
  if (completenessLevel === 'high') score += 0.1;
  else if (completenessLevel === 'low') score -= 0.1;

  // Single source penalty
  if (!hasScrapeSrc && !hasPerplexitySrc) score -= 0.1;

  return Math.max(0.1, Math.min(1.0, score));
}

/**
 * Validate extracted data completeness (code-only, no AI).
 * Returns a list of warnings for the execution log.
 */
function validateExtracted(extracted) {
  const warnings = [];

  if (!extracted.key_features?.length) warnings.push('No key features extracted');
  if (!extracted.use_cases?.length) warnings.push('No use cases extracted');
  if (!extracted.summary) warnings.push('No summary generated');
  if (!extracted.primary_category) warnings.push('No primary category assigned');
  if (!extracted.competitors?.length) warnings.push('No competitors identified');
  if (!extracted.pricing_info?.model) warnings.push('Pricing model unknown');

  return warnings;
}

module.exports = { computeConfidence, validateExtracted };
