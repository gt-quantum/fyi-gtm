/**
 * Analyst Agent — Classification and summary generation.
 * Uses Haiku for taxonomy assignment and summary writing.
 */
const { ask } = require('../../shared/clients/ai');
const { parseJSON } = require('./extractors');
const prompts = require('./prompts');

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

  return {
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
  };
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
