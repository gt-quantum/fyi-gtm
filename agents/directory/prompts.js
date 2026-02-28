/**
 * Prompt assembly for the Directory Writer Agent.
 *
 * Builds the full writing prompt from tool data + config settings.
 * The agent produces ONLY markdown body content — frontmatter is
 * generated programmatically by buildFrontmatterFromTool().
 */

/**
 * Build the system prompt for the writing model.
 *
 * @param {Object} config - Writing config from config.settings (scope: agents/directory)
 * @returns {string} System prompt
 */
function buildSystemPrompt(config) {
  return `You are a professional B2B SaaS reviewer writing for FYI GTM, a directory of go-to-market tools.

WRITING GUIDELINES:
- Tone: ${config.tone || 'Professional but conversational'}
- Emphasize: ${config.emphasize || 'Real user feedback, practical use cases, clear pricing'}
- Avoid: ${config.avoid || 'Promotional language, unverified claims, generic filler'}
- Target word count: ${config.word_count_target || '750'}
- Sections to include: ${formatSections(config.review_sections)}

IMPORTANT RULES:
1. Output ONLY the markdown body content. No frontmatter (---) blocks.
2. Follow the review template structure closely.
3. Use ## for main sections, ### for subsections.
4. Be specific and data-driven — use the provided tool data, not general knowledge.
5. If data is missing for a section, write a shorter version rather than fabricating details.
6. Keep the tone balanced — acknowledge both strengths and weaknesses.`;
}

/**
 * Build the user message with tool data and template.
 *
 * @param {Object} tool - Full tool row from tools table
 * @param {Object} config - Writing config
 * @returns {string} User message
 */
function buildUserMessage(tool, config) {
  const parts = [];

  parts.push(`Write a comprehensive review of ${tool.name} following the template below.`);
  parts.push('');

  // Template
  if (config.review_template) {
    parts.push('REVIEW TEMPLATE:');
    parts.push(config.review_template);
    parts.push('');
  }

  // Core tool data
  parts.push('TOOL DATA:');
  parts.push(`- Name: ${tool.name}`);
  parts.push(`- URL: ${tool.url}`);
  if (tool.primary_category) parts.push(`- Category: ${tool.primary_category}`);
  if (tool.summary) parts.push(`- Summary: ${tool.summary}`);
  if (tool.best_for) parts.push(`- Best For: ${tool.best_for}`);
  parts.push('');

  // Structured data sections
  if (tool.key_features && tool.key_features.length > 0) {
    parts.push('KEY FEATURES:');
    parts.push(formatJSON(tool.key_features));
    parts.push('');
  }

  if (tool.pricing_info && Object.keys(tool.pricing_info).length > 0) {
    parts.push('PRICING:');
    parts.push(formatJSON(tool.pricing_info));
    parts.push('');
  }

  if (tool.pros_cons && (tool.pros_cons.pros?.length || tool.pros_cons.cons?.length)) {
    parts.push('PROS & CONS:');
    parts.push(formatJSON(tool.pros_cons));
    parts.push('');
  }

  if (tool.user_sentiment) {
    parts.push('USER SENTIMENT:');
    parts.push(formatJSON(tool.user_sentiment));
    parts.push('');
  }

  if (tool.ratings) {
    parts.push('RATINGS:');
    parts.push(formatJSON(tool.ratings));
    parts.push('');
  }

  if (tool.competitors && tool.competitors.length > 0) {
    parts.push('COMPETITORS:');
    parts.push(formatJSON(tool.competitors));
    parts.push('');
  }

  if (tool.company_info && Object.keys(tool.company_info).length > 0) {
    parts.push('COMPANY INFO:');
    parts.push(formatJSON(tool.company_info));
    parts.push('');
  }

  if (tool.use_cases && tool.use_cases.length > 0) {
    parts.push('USE CASES:');
    parts.push(formatJSON(tool.use_cases));
    parts.push('');
  }

  if (tool.recent_developments && tool.recent_developments.length > 0) {
    parts.push('RECENT DEVELOPMENTS:');
    parts.push(formatJSON(tool.recent_developments));
    parts.push('');
  }

  // Research blob (truncated)
  const blob = tool.research_blob || tool.raw_research?.perplexity_general;
  if (blob) {
    const truncated = typeof blob === 'string' ? blob.slice(0, 3000) : JSON.stringify(blob).slice(0, 3000);
    parts.push('RESEARCH SUMMARY (truncated):');
    parts.push(truncated);
    parts.push('');
  }

  parts.push('Write the review now. Output ONLY the markdown content, no frontmatter.');

  return parts.join('\n');
}

/**
 * Format JSON data for prompt inclusion — compact but readable.
 */
function formatJSON(data) {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

/**
 * Format review_sections config value (may be JSON string or array).
 */
function formatSections(val) {
  if (!val) return 'intro, key capabilities, pricing, pros & cons, user sentiment, verdict';
  if (Array.isArray(val)) return val.join(', ');
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed.join(', ');
  } catch {}
  return val;
}

module.exports = { buildSystemPrompt, buildUserMessage };
