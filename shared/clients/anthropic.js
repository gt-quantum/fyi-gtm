const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Send a message to Claude.
 *
 * @param {Object} params - { model, system, messages, tools, max_tokens, temperature }
 * @returns {Promise<Object>} Claude API response
 */
async function ask(params) {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: params.model,
    max_tokens: params.max_tokens || 4096,
    system: params.system || undefined,
    messages: params.messages,
    tools: params.tools || undefined,
    temperature: params.temperature !== undefined ? params.temperature : 0.7
  });

  return response;
}

/**
 * Extract text content from a Claude response.
 */
function getText(response) {
  const block = response.content?.find(b => b.type === 'text');
  return block?.text || '';
}

/**
 * Extract tool use blocks from a Claude response.
 */
function getToolUses(response) {
  return response.content?.filter(b => b.type === 'tool_use') || [];
}

module.exports = { ask, getText, getToolUses, getClient };
