/**
 * OpenAI client — same pattern as anthropic.js.
 * Uses the OpenAI Chat Completions API.
 */

const BASE_URL = 'https://api.openai.com/v1';

/**
 * Send a message to OpenAI.
 *
 * @param {Object} params - { model, system, messages, tools, max_tokens, temperature }
 * @returns {Promise<Object>} OpenAI API response
 */
async function ask(params) {
  const messages = [];

  if (params.system) {
    messages.push({ role: 'system', content: params.system });
  }

  messages.push(...params.messages);

  const body = {
    model: params.model,
    messages,
    max_tokens: params.max_tokens || 4096,
    temperature: params.temperature !== undefined ? params.temperature : 0.7
  };

  if (params.tools) {
    body.tools = params.tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema
      }
    }));
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${error}`);
  }

  return response.json();
}

/**
 * Extract text from an OpenAI response.
 */
function getText(response) {
  return response.choices?.[0]?.message?.content || '';
}

/**
 * Extract tool calls from an OpenAI response.
 */
function getToolCalls(response) {
  return response.choices?.[0]?.message?.tool_calls || [];
}

module.exports = { ask, getText, getToolCalls };
