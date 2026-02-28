/**
 * Analyst Agent — Classification and summary generation.
 * Uses Haiku for taxonomy assignment and summary writing.
 */
const { ask } = require('../../shared/clients/ai');
const { parseJSON } = require('./extractors');
const prompts = require('./prompts');

// Valid taxonomy values — must match admin/lib/taxonomy.js
const VALID_CATEGORIES = [
  'contact-company-data', 'data-enrichment-hygiene', 'intent-signals', 'market-competitive-research', 'ai-data-agents',
  'marketing-automation-email', 'abm-demand-gen', 'content-creative', 'social-community', 'seo-organic', 'ai-marketing-tools',
  'crm', 'sales-engagement', 'sales-enablement', 'cpq-proposals', 'ai-sales-assistants',
  'lead-management', 'pipeline-forecasting', 'revenue-analytics-attribution', 'workflow-integration', 'ai-revops-tools',
  'customer-success', 'product-analytics-adoption', 'support-feedback', 'ai-customer-tools',
  'partner-management', 'affiliates-referrals', 'ai-partnership-tools',
];

const CATEGORY_TO_GROUP = {
  'contact-company-data': 'data-intelligence', 'data-enrichment-hygiene': 'data-intelligence',
  'intent-signals': 'data-intelligence', 'market-competitive-research': 'data-intelligence', 'ai-data-agents': 'data-intelligence',
  'marketing-automation-email': 'marketing', 'abm-demand-gen': 'marketing', 'content-creative': 'marketing',
  'social-community': 'marketing', 'seo-organic': 'marketing', 'ai-marketing-tools': 'marketing',
  'crm': 'sales', 'sales-engagement': 'sales', 'sales-enablement': 'sales',
  'cpq-proposals': 'sales', 'ai-sales-assistants': 'sales',
  'lead-management': 'revenue-operations', 'pipeline-forecasting': 'revenue-operations',
  'revenue-analytics-attribution': 'revenue-operations', 'workflow-integration': 'revenue-operations', 'ai-revops-tools': 'revenue-operations',
  'customer-success': 'customer', 'product-analytics-adoption': 'customer',
  'support-feedback': 'customer', 'ai-customer-tools': 'customer',
  'partner-management': 'partnerships', 'affiliates-referrals': 'partnerships', 'ai-partnership-tools': 'partnerships',
};

const VALID_GROUPS = ['data-intelligence', 'marketing', 'sales', 'revenue-operations', 'customer', 'partnerships'];
const VALID_PRICING = ['free', 'freemium', 'paid', 'enterprise'];
const VALID_COMPANY_SIZE = ['smb', 'mid-market', 'enterprise'];
const VALID_AI_AUTOMATION = ['ai-native', 'ai-enhanced', 'automation'];
const VALID_PRICING_TAGS = ['free-tier', 'freemium', 'paid-only', 'enterprise-pricing'];

/**
 * Validate and clamp classification values to allowed sets.
 * Invalid values become null to fail visibly.
 */
function validateClassification(result) {
  // Validate primary_category
  if (result.primary_category && !VALID_CATEGORIES.includes(result.primary_category)) {
    console.warn(`[classifier] Invalid primary_category "${result.primary_category}" — setting to null`);
    result.primary_category = null;
  }

  // Auto-fix group_name to match primary_category
  if (result.primary_category) {
    const correctGroup = CATEGORY_TO_GROUP[result.primary_category];
    if (result.group_name !== correctGroup) {
      console.warn(`[classifier] group_name "${result.group_name}" doesn't match category "${result.primary_category}" — fixing to "${correctGroup}"`);
      result.group_name = correctGroup;
    }
  } else if (result.group_name && !VALID_GROUPS.includes(result.group_name)) {
    console.warn(`[classifier] Invalid group_name "${result.group_name}" — setting to null`);
    result.group_name = null;
  }

  // Validate categories array
  if (Array.isArray(result.categories)) {
    result.categories = result.categories.filter(c => VALID_CATEGORIES.includes(c));
    if (result.primary_category && !result.categories.includes(result.primary_category)) {
      result.categories.unshift(result.primary_category);
    }
  }

  // Validate pricing
  if (result.pricing && !VALID_PRICING.includes(result.pricing)) {
    console.warn(`[classifier] Invalid pricing "${result.pricing}" — setting to null`);
    result.pricing = null;
  }

  // Validate company_size
  if (Array.isArray(result.company_size)) {
    result.company_size = result.company_size.filter(v => VALID_COMPANY_SIZE.includes(v));
  }

  // Validate ai_automation
  if (Array.isArray(result.ai_automation)) {
    result.ai_automation = result.ai_automation.filter(v => VALID_AI_AUTOMATION.includes(v));
  }

  // Validate pricing_tags
  if (Array.isArray(result.pricing_tags)) {
    result.pricing_tags = result.pricing_tags.filter(v => VALID_PRICING_TAGS.includes(v));
  }

  return result;
}

/**
 * Classify tool into taxonomy (primary_category, group_name, tags, etc.).
 */
async function classify(toolName, toolUrl, rawResearch, extractedFeatures, extractedPricing, provider, model) {
  const prompt = prompts.buildClassificationPrompt(toolName, toolUrl, rawResearch, extractedFeatures, extractedPricing);

  const res = await ask(provider, {
    model,
    system: prompts.CLASSIFICATION_SYSTEM,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2048,
    temperature: 0.1
  });

  let text;
  if (provider === 'anthropic' || provider === 'claude') {
    const anthropic = require('../../shared/clients/anthropic');
    text = anthropic.getText(res);
  } else {
    const openai = require('../../shared/clients/openai');
    text = openai.getText(res);
  }

  const result = parseJSON(text);

  // Validate all enum values against allowed sets
  const validated = validateClassification({
    category: result.category || null,
    primary_category: result.primary_category || null,
    categories: Array.isArray(result.categories) ? result.categories : [],
    group_name: result.group_name || null,
    tags: Array.isArray(result.tags) ? result.tags : [],
    pricing: result.pricing || null,
    price_note: result.price_note || null,
    pricing_tags: Array.isArray(result.pricing_tags) ? result.pricing_tags : [],
    company_size: Array.isArray(result.company_size) ? result.company_size : [],
    ai_automation: Array.isArray(result.ai_automation) ? result.ai_automation : [],
    integrations: Array.isArray(result.integrations) ? result.integrations : []
  });

  return validated;
}

/**
 * Generate summary and best_for statement.
 */
async function generateSummary(toolName, toolUrl, rawResearch, extractedFeatures, provider, model) {
  const prompt = prompts.buildSummaryPrompt(toolName, toolUrl, rawResearch, extractedFeatures);

  const res = await ask(provider, {
    model,
    system: 'You are a concise technical writer. Output ONLY valid JSON.',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1024,
    temperature: 0.3
  });

  let text;
  if (provider === 'anthropic' || provider === 'claude') {
    const anthropic = require('../../shared/clients/anthropic');
    text = anthropic.getText(res);
  } else {
    const openai = require('../../shared/clients/openai');
    text = openai.getText(res);
  }

  const result = parseJSON(text);

  return {
    summary: result.summary || null,
    best_for: result.best_for || null
  };
}

module.exports = { classify, generateSummary };
