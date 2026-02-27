/**
 * Analyst Agent — Extraction functions.
 * Each function calls an AI model to extract structured data from raw_research.
 */
const { ask } = require('../../shared/clients/ai');
const prompts = require('./prompts');

/**
 * Parse JSON from AI response text, handling markdown code blocks.
 */
function parseJSON(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON object found in response');
  return JSON.parse(jsonMatch[0]);
}

/**
 * Call an AI model and extract JSON from the response.
 */
async function extractWithAI(provider, model, systemPrompt, userPrompt) {
  const res = await ask(provider, {
    model,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    max_tokens: 4096,
    temperature: 0.2
  });

  let text;
  if (provider === 'anthropic' || provider === 'claude') {
    const anthropic = require('../../shared/clients/anthropic');
    text = anthropic.getText(res);
  } else {
    const openai = require('../../shared/clients/openai');
    text = openai.getText(res);
  }

  return parseJSON(text);
}

/**
 * Extract features, use cases, and recent developments.
 * @returns {{ key_features, use_cases, recent_developments }}
 */
async function extractFeatures(toolName, rawResearch, provider, model) {
  const prompt = prompts.buildFeaturesPrompt(toolName, rawResearch);
  const result = await extractWithAI(provider, model, prompts.EXTRACTION_SYSTEM, prompt);

  return {
    key_features: Array.isArray(result.key_features) ? result.key_features : [],
    use_cases: Array.isArray(result.use_cases) ? result.use_cases : [],
    recent_developments: Array.isArray(result.recent_developments) ? result.recent_developments : []
  };
}

/**
 * Extract sentiment, pros/cons, and ratings.
 * @returns {{ pros_cons, user_sentiment, ratings }}
 */
async function extractSentiment(toolName, rawResearch, provider, model) {
  const prompt = prompts.buildSentimentPrompt(toolName, rawResearch);
  const result = await extractWithAI(provider, model, prompts.EXTRACTION_SYSTEM, prompt);

  return {
    pros_cons: result.pros_cons || { pros: [], cons: [] },
    user_sentiment: result.user_sentiment || {},
    ratings: result.ratings || {}
  };
}

/**
 * Extract structured pricing information.
 * @returns {{ pricing_info }}
 */
async function extractPricing(toolName, rawResearch, provider, model) {
  const prompt = prompts.buildPricingPrompt(toolName, rawResearch);
  const result = await extractWithAI(provider, model, prompts.EXTRACTION_SYSTEM, prompt);

  return {
    pricing_info: result.pricing_info || {}
  };
}

/**
 * Extract competitor data.
 * @returns {{ competitors }}
 */
async function extractCompetitors(toolName, rawResearch, provider, model) {
  const prompt = prompts.buildCompetitorsPrompt(toolName, rawResearch);
  const result = await extractWithAI(provider, model, prompts.EXTRACTION_SYSTEM, prompt);

  return {
    competitors: Array.isArray(result.competitors) ? result.competitors : []
  };
}

/**
 * Extract company information.
 * @returns {{ company_info }}
 */
async function extractCompanyInfo(toolName, rawResearch, provider, model) {
  const prompt = prompts.buildCompanyInfoPrompt(toolName, rawResearch);
  const result = await extractWithAI(provider, model, prompts.EXTRACTION_SYSTEM, prompt);

  return {
    company_info: result.company_info || {}
  };
}

module.exports = {
  extractFeatures,
  extractSentiment,
  extractPricing,
  extractCompetitors,
  extractCompanyInfo,
  parseJSON
};
