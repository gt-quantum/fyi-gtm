/**
 * Source tracking utilities for the Research Agent.
 * Deduplicates and structures all URLs accessed during research.
 */

/**
 * Create a new source tracker.
 */
function createTracker() {
  const sources = new Map();

  return {
    /**
     * Add a source URL with metadata.
     * @param {string} url
     * @param {string} type - 'scrape', 'perplexity_citation', 'perplexity_query'
     * @param {Object} meta - { title, section, model }
     */
    add(url, type, meta = {}) {
      if (!url || typeof url !== 'string') return;
      const normalized = url.replace(/\/$/, '');
      const existing = sources.get(normalized);
      if (existing) {
        if (!existing.types.includes(type)) existing.types.push(type);
        return;
      }
      sources.set(normalized, {
        url: normalized,
        types: [type],
        ...meta,
        added_at: new Date().toISOString()
      });
    },

    /**
     * Add multiple citation URLs from a Perplexity response.
     * @param {string[]} citations
     * @param {string} queryType - e.g. 'general', 'pricing', 'reviews', 'competitors'
     */
    addCitations(citations, queryType) {
      if (!Array.isArray(citations)) return;
      for (const url of citations) {
        this.add(url, 'perplexity_citation', { query_type: queryType });
      }
    },

    /**
     * Get deduplicated source list as array.
     * @returns {Object[]}
     */
    toArray() {
      return Array.from(sources.values());
    },

    /** @returns {number} */
    get count() {
      return sources.size;
    }
  };
}

module.exports = { createTracker };
