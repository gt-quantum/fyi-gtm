/**
 * Kit.com v4 API client for newsletter delivery.
 * Handles broadcast creation, scheduling, and status checks.
 * Includes retry logic for intermittent 422 errors.
 */

const KIT_API = 'https://api.kit.com/v4';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function headers() {
  return {
    'Authorization': `Bearer ${process.env.KIT_API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

/**
 * Make a Kit API request with retry logic for 422 errors.
 */
async function kitFetch(path, options = {}) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`${KIT_API}${path}`, {
      ...options,
      headers: { ...headers(), ...options.headers }
    });

    if (res.ok) return res.json();

    const errorText = await res.text();

    // Retry on 422 (intermittent Kit issue)
    if (res.status === 422 && attempt < MAX_RETRIES) {
      console.warn(`[kit] 422 on attempt ${attempt}/${MAX_RETRIES}, retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
      lastError = new Error(`Kit API 422: ${errorText}`);
      continue;
    }

    throw new Error(`Kit API error ${res.status}: ${errorText}`);
  }

  throw lastError;
}

/**
 * Create a broadcast (newsletter email).
 *
 * @param {Object} params - { subject, content, preview_text }
 * @returns {Promise<Object>} Broadcast object with id
 */
async function createBroadcast(params) {
  return kitFetch('/broadcasts', {
    method: 'POST',
    body: JSON.stringify({
      broadcast: {
        subject: params.subject,
        content: params.content,
        preview_text: params.preview_text || '',
        email_layout_template: params.template || 'text',
        public: true
      }
    })
  });
}

/**
 * Schedule a broadcast for a specific time.
 *
 * @param {string} broadcastId - Kit broadcast ID
 * @param {string} scheduledAt - ISO 8601 datetime
 * @returns {Promise<Object>}
 */
async function scheduleBroadcast(broadcastId, scheduledAt) {
  return kitFetch(`/broadcasts/${broadcastId}`, {
    method: 'PUT',
    body: JSON.stringify({
      broadcast: {
        send_at: scheduledAt
      }
    })
  });
}

/**
 * Get broadcast details.
 *
 * @param {string} broadcastId - Kit broadcast ID
 * @returns {Promise<Object>}
 */
async function getBroadcast(broadcastId) {
  return kitFetch(`/broadcasts/${broadcastId}`);
}

/**
 * List recent broadcasts.
 *
 * @param {number} page - Page number (default 1)
 * @returns {Promise<Object>}
 */
async function listBroadcasts(page = 1) {
  return kitFetch(`/broadcasts?page=${page}`);
}

module.exports = { createBroadcast, scheduleBroadcast, getBroadcast, listBroadcasts };
