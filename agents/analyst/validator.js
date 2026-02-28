/**
 * Analyst Agent — Validation, hallucination detection, and confidence scoring.
 *
 * Source confidence hierarchy (highest → lowest):
 *   Website scrape + JSON-LD           → +0.3
 *   LinkedIn / Crunchbase verified     → +0.2
 *   G2 / Capterra / TrustRadius       → +0.2
 *   Product Hunt / YC / press          → +0.15
 *   Reddit / HN / Twitter             → +0.1
 *   Open Perplexity (unscoped)        → +0.1
 *
 * Penalties:
 *   Single source only                → -0.15
 *   INSUFFICIENT_DATA per query       → -0.1
 *   Scraper failure                   → -0.15
 *   Consolidation contradictions      → -0.1 each (max -0.3)
 *   Critical hallucination flags      → -0.4
 */

/**
 * Detect hallucinations in extracted data.
 *
 * @param {Object} rawResearch - raw_research JSONB
 * @param {Object} extracted - All extracted data
 * @returns {{ flags: Array<{type, detail, severity}>, hasCritical: boolean }}
 */
function detectHallucinations(rawResearch, extracted) {
  const flags = [];
  const scrape = rawResearch.scrape || {};
  const homepage = scrape.homepage || {};

  // 1. Wrong-product detection: check if extracted data mentions unrelated domains
  if (homepage.description) {
    const productKeywords = extractKeywords(homepage.description);
    if (productKeywords.length >= 2) {
      // Check features for off-topic content
      const featureText = (extracted.key_features || []).map(f => f.description || '').join(' ').toLowerCase();
      const offTopicSignals = ['fleet management', 'real estate', 'medical', 'healthcare', 'logistics',
        'construction', 'agriculture', 'manufacturing', 'insurance', 'legal', 'education',
        'restaurant', 'hotel', 'travel', 'automotive'];

      for (const signal of offTopicSignals) {
        if (featureText.includes(signal) && !homepage.description.toLowerCase().includes(signal)) {
          flags.push({
            type: 'wrong_product',
            detail: `Features mention "${signal}" but homepage doesn't — possible wrong product data`,
            severity: 'critical'
          });
        }
      }
    }
  }

  // 2. Unverified ratings — if scraper failed AND reviews had mostly irrelevant citations
  const scraperFailed = !!homepage.error;
  const reviewsData = rawResearch.perplexity_reviews || {};
  const reviewsCitationRelevance = reviewsData.citation_relevance || 1;
  const reviewsInsufficient = reviewsData.insufficient || false;

  if (extracted.ratings) {
    const hasRatings = extracted.ratings.g2_score || extracted.ratings.capterra_score || extracted.ratings.trustradius_score;
    if (hasRatings) {
      if (reviewsInsufficient) {
        flags.push({
          type: 'unverified_ratings',
          detail: 'Reviews query returned INSUFFICIENT_DATA but ratings were extracted — likely fabricated',
          severity: 'critical'
        });
      } else if (scraperFailed && reviewsCitationRelevance < 0.3) {
        flags.push({
          type: 'unverified_ratings',
          detail: `Scraper failed AND <30% review citations from relevant domains (${(reviewsCitationRelevance * 100).toFixed(0)}%) — ratings may be fabricated`,
          severity: 'critical'
        });
      }
    }
  }

  // 3. Consolidation contradictions
  const contradictions = rawResearch.consolidation?.contradictions || [];
  if (contradictions.length > 0) {
    flags.push({
      type: 'contradictions',
      detail: `${contradictions.length} contradiction(s) found across sources`,
      severity: contradictions.length >= 3 ? 'critical' : 'warning'
    });
  }

  // 4. INSUFFICIENT_DATA responses
  const insufficientQueries = [];
  for (const key of ['perplexity_general', 'perplexity_pricing', 'perplexity_reviews', 'perplexity_competitors', 'perplexity_company', 'perplexity_community']) {
    if (rawResearch[key]?.insufficient) {
      insufficientQueries.push(key.replace('perplexity_', ''));
    }
  }
  if (insufficientQueries.length > 0) {
    flags.push({
      type: 'insufficient_data',
      detail: `INSUFFICIENT_DATA returned by: ${insufficientQueries.join(', ')}`,
      severity: insufficientQueries.length >= 3 ? 'critical' : 'warning'
    });
  }

  // 5. Quality gate status
  if (rawResearch.quality_gate && !rawResearch.quality_gate.passed) {
    flags.push({
      type: 'quality_gate_failed',
      detail: 'Research quality gate did not pass — data may be unreliable',
      severity: 'critical'
    });
  }

  const hasCritical = flags.some(f => f.severity === 'critical');
  return { flags, hasCritical };
}

/**
 * Apply hallucination fixes — null out fabricated data.
 *
 * @param {Object} extracted - Mutable extracted data
 * @param {Array} flags - Hallucination flags
 * @returns {Object} Modified extracted data
 */
function applyHallucinationFixes(extracted, flags) {
  for (const flag of flags) {
    if (flag.severity !== 'critical') continue;

    if (flag.type === 'unverified_ratings') {
      // Null out all ratings
      if (extracted.ratings) {
        extracted.ratings = {
          g2_score: null, g2_reviews: null,
          capterra_score: null, capterra_reviews: null,
          trustradius_score: null,
          _nulled_reason: flag.detail
        };
      }
    }

    if (flag.type === 'wrong_product') {
      // Null out sentiment that came from wrong product
      if (extracted.user_sentiment) {
        extracted.user_sentiment._flagged = flag.detail;
      }
    }
  }

  return extracted;
}

/**
 * Compute source-weighted confidence scores for each extracted field.
 *
 * @param {Object} rawResearch - The raw_research JSONB
 * @param {Object} extracted - All extracted data
 * @param {Array} hallucinationFlags - From detectHallucinations()
 * @returns {{ confidence_scores, research_gaps }}
 */
function computeConfidence(rawResearch, extracted, hallucinationFlags = []) {
  const scrape = rawResearch.scrape || {};
  const consolidation = rawResearch.consolidation?.response || {};
  const completeness = consolidation.completeness || {};
  const sourceQuality = consolidation.source_quality || {};

  const scores = {};
  const gaps = [];

  // Source availability flags
  const scraperWorked = !scrape.homepage?.error;
  const hasJsonLd = (scrape.json_ld?.length || 0) > 0;
  const hasLinkedIn = sourceQuality.company_profiles_found?.includes('linkedin') || false;
  const hasCrunchbase = sourceQuality.company_profiles_found?.includes('crunchbase') || false;
  const hasG2 = sourceQuality.review_platforms_found?.includes('g2') || false;
  const hasCapterra = sourceQuality.review_platforms_found?.includes('capterra') || false;
  const hasProductHunt = !!rawResearch.perplexity_community?.response && !rawResearch.perplexity_community.insufficient;
  const hasCompanyData = !!rawResearch.perplexity_company?.response && !rawResearch.perplexity_company.insufficient;
  const hasCommunityData = !!rawResearch.perplexity_community?.response && !rawResearch.perplexity_community.insufficient;

  // Insufficient query penalties
  const insufficientCount = ['perplexity_general', 'perplexity_pricing', 'perplexity_reviews',
    'perplexity_competitors', 'perplexity_company', 'perplexity_community']
    .filter(k => rawResearch[k]?.insufficient).length;

  const contradictionPenalty = Math.min(0.3, (consolidation.contradictions?.length || 0) * 0.1);
  const hasCriticalFlags = hallucinationFlags.some(f => f.severity === 'critical');

  // Key features
  scores.key_features = scoreFieldWeighted(
    extracted.key_features,
    { hasArray: true, minItems: 3 },
    {
      websiteScrape: scraperWorked && (scrape.features_page?.found || hasJsonLd),
      verifiedProfiles: false,
      reviewPlatforms: false,
      launchSites: hasProductHunt,
      communityMentions: hasCommunityData,
      openPerplexity: !!rawResearch.perplexity_general?.response,
    },
    completeness.features
  );
  if (scores.key_features < 0.5) gaps.push('key_features: insufficient feature data');

  // Pricing info
  scores.pricing_info = scoreFieldWeighted(
    extracted.pricing_info,
    { hasObject: true, requiredKeys: ['model'] },
    {
      websiteScrape: scraperWorked && scrape.pricing_page?.found,
      verifiedProfiles: false,
      reviewPlatforms: false,
      launchSites: false,
      communityMentions: false,
      openPerplexity: !!rawResearch.perplexity_pricing?.response && !rawResearch.perplexity_pricing?.insufficient,
    },
    completeness.pricing
  );
  if (scores.pricing_info < 0.5) gaps.push('pricing_info: pricing data incomplete or unavailable');

  // User sentiment / ratings
  scores.user_sentiment = scoreFieldWeighted(
    extracted.user_sentiment,
    { hasObject: true, requiredKeys: ['overall_sentiment'] },
    {
      websiteScrape: false,
      verifiedProfiles: false,
      reviewPlatforms: hasG2 || hasCapterra,
      launchSites: hasProductHunt,
      communityMentions: hasCommunityData,
      openPerplexity: !!rawResearch.perplexity_reviews?.response && !rawResearch.perplexity_reviews?.insufficient,
    },
    completeness.reviews
  );
  if (scores.user_sentiment < 0.5) gaps.push('user_sentiment: limited review data');

  // Ratings (separate from sentiment — more strict)
  scores.ratings = scoreFieldWeighted(
    extracted.ratings,
    { hasObject: true, requiredKeys: ['g2_score'] },
    {
      websiteScrape: false,
      verifiedProfiles: false,
      reviewPlatforms: hasG2 || hasCapterra,
      launchSites: false,
      communityMentions: false,
      openPerplexity: false, // Unscoped Perplexity ratings are unreliable
    },
    null
  );

  // Competitors
  scores.competitors = scoreFieldWeighted(
    extracted.competitors,
    { hasArray: true, minItems: 2 },
    {
      websiteScrape: false,
      verifiedProfiles: false,
      reviewPlatforms: hasG2, // G2 compare pages
      launchSites: false,
      communityMentions: hasCommunityData,
      openPerplexity: !!rawResearch.perplexity_competitors?.response && !rawResearch.perplexity_competitors?.insufficient,
    },
    completeness.competitors
  );
  if (scores.competitors < 0.5) gaps.push('competitors: insufficient competitive data');

  // Company info
  scores.company_info = scoreFieldWeighted(
    extracted.company_info,
    { hasObject: true, requiredKeys: ['founded_year'] },
    {
      websiteScrape: scraperWorked && (scrape.about_page?.found || hasJsonLd),
      verifiedProfiles: hasLinkedIn || hasCrunchbase,
      reviewPlatforms: false,
      launchSites: false,
      communityMentions: false,
      openPerplexity: hasCompanyData,
    },
    completeness.company_info
  );
  if (scores.company_info < 0.5) gaps.push('company_info: limited company information');

  // Classification (meta-score)
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

  // Apply global penalties
  for (const key of Object.keys(scores)) {
    // Scraper failure penalty
    if (!scraperWorked) scores[key] = Math.max(0.1, scores[key] - 0.15);
    // INSUFFICIENT_DATA penalty
    scores[key] = Math.max(0.1, scores[key] - (insufficientCount * 0.05));
    // Contradiction penalty
    scores[key] = Math.max(0.1, scores[key] - contradictionPenalty);
    // Critical hallucination penalty
    if (hasCriticalFlags) scores[key] = Math.max(0.1, scores[key] - 0.2);
  }

  // Overall
  const fieldScores = Object.values(scores);
  scores.overall = parseFloat((fieldScores.reduce((a, b) => a + b, 0) / fieldScores.length).toFixed(2));

  // Round all scores
  for (const key of Object.keys(scores)) {
    scores[key] = parseFloat(Math.max(0.1, Math.min(1.0, scores[key])).toFixed(2));
  }

  // Add consolidation gaps
  if (consolidation.gaps) {
    for (const gap of consolidation.gaps) {
      if (!gaps.includes(gap)) gaps.push(gap);
    }
  }

  // Add hallucination flags as gaps
  for (const flag of hallucinationFlags) {
    gaps.push(`${flag.type}: ${flag.detail}`);
  }

  return { confidence_scores: scores, research_gaps: gaps };
}

/**
 * Score a single field using source-weighted hierarchy.
 */
function scoreFieldWeighted(data, checks, sources, completenessLevel) {
  let score = 0.3; // Lower base — earned through sources

  // Check if data exists and meets minimum requirements
  if (checks.hasArray) {
    if (!Array.isArray(data) || data.length === 0) return 0.1;
    if (data.length < (checks.minItems || 1)) score -= 0.05;
  }
  if (checks.hasObject) {
    if (!data || typeof data !== 'object') return 0.1;
    if (checks.requiredKeys) {
      const missing = checks.requiredKeys.filter(k => data[k] == null);
      if (missing.length > 0) score -= 0.05;
    }
  }

  // Source bonuses (additive, from priority hierarchy)
  if (sources.websiteScrape) score += 0.3;
  if (sources.verifiedProfiles) score += 0.2;
  if (sources.reviewPlatforms) score += 0.2;
  if (sources.launchSites) score += 0.15;
  if (sources.communityMentions) score += 0.1;
  if (sources.openPerplexity) score += 0.1;

  // Single source penalty
  const sourceCount = Object.values(sources).filter(Boolean).length;
  if (sourceCount <= 1) score -= 0.15;

  // Completeness from consolidation
  if (completenessLevel === 'high') score += 0.05;
  else if (completenessLevel === 'low') score -= 0.1;

  return Math.max(0.1, Math.min(1.0, score));
}

/**
 * Validate extracted data completeness (code-only, no AI).
 */
function validateExtracted(extracted) {
  const warnings = [];

  if (!extracted.key_features?.length) warnings.push('No key features extracted');
  if (!extracted.use_cases?.length) warnings.push('No use cases extracted');
  if (!extracted.summary) warnings.push('No summary generated');
  if (!extracted.primary_category) warnings.push('No primary category assigned');
  if (!extracted.competitors?.length) warnings.push('No competitors identified');
  if (!extracted.pricing_info?.model) warnings.push('Pricing model unknown');
  if (!extracted.best_for) warnings.push('No best_for statement generated');

  return warnings;
}

/**
 * Extract lowercase keywords from a description.
 */
function extractKeywords(text) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 20);
}

module.exports = { computeConfidence, validateExtracted, detectHallucinations, applyHallucinationFixes };
