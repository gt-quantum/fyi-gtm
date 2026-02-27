/**
 * Perplexity API client for web-grounded research.
 * Uses the OpenAI-compatible chat completions endpoint.
 */

const BASE_URL = 'https://api.perplexity.ai';

/**
 * Send a research query to Perplexity.
 *
 * @param {Object} params - { model, system, messages, search_recency_filter }
 * @returns {Promise<Object>} Perplexity response
 */
async function ask(params) {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: params.model || 'sonar',
      messages: [
        ...(params.system ? [{ role: 'system', content: params.system }] : []),
        ...params.messages
      ],
      search_recency_filter: params.search_recency_filter || undefined,
      temperature: params.temperature !== undefined ? params.temperature : 0.7
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error ${response.status}: ${error}`);
  }

  return response.json();
}

/**
 * Extract text from a Perplexity response.
 */
function getText(response) {
  return response.choices?.[0]?.message?.content || '';
}

/**
 * Extract citations from a Perplexity response.
 */
function getCitations(response) {
  return response.citations || [];
}

module.exports = { ask, getText, getCitations };
