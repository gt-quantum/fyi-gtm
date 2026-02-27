/**
 * Unified AI router — routes to Anthropic, OpenAI, or Perplexity based on provider.
 */
const anthropicClient = require('./anthropic');
const openaiClient = require('./openai');
const perplexityClient = require('./perplexity');

/**
 * Route AI request to the appropriate provider.
 *
 * @param {string} provider - 'anthropic', 'openai', or 'perplexity'
 * @param {Object} params - Provider-specific params
 * @returns {Promise<Object>} Provider response
 */
async function ask(provider, params) {
  switch (provider) {
    case 'anthropic':
    case 'claude':
      return anthropicClient.ask(params);

    case 'openai':
    case 'gpt':
      return openaiClient.ask(params);

    case 'perplexity':
      return perplexityClient.ask(params);

    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

module.exports = { ask, anthropicClient, openaiClient, perplexityClient };
