/**
 * Markdown utilities for generating Astro-compatible tool review files.
 * Used by the Bulk Publish worker to generate markdown from directory_entries.
 *
 * Includes validation against the Astro content schema to prevent
 * broken builds on Cloudflare Pages.
 */

/**
 * Astro tools content schema — authoritative list of allowed frontmatter fields.
 * Mirrors fyigtmdotcom/fyigtm-web/src/content/config.ts
 */
const REQUIRED_FIELDS = ['name', 'description', 'url', 'primaryCategory', 'categories', 'publishedAt'];

const ALLOWED_FIELDS = new Set([
  // Required
  'name', 'description', 'url', 'primaryCategory', 'categories', 'publishedAt',
  // Optional
  'logo', 'aiAutomation', 'pricingTags', 'companySize', 'integrations',
  'pricing', 'priceNote', 'featured', 'updatedAt',
  'upvotes', 'comments', 'views',
  'isNew', 'isVerified', 'hasDeal', 'dealDescription', 'isDiscontinued',
]);

const VALID_PRICING = ['free', 'freemium', 'paid', 'enterprise'];

/**
 * Known old-schema field names that should NOT appear in output.
 * Maps old field → new field for error messages.
 */
const OLD_FIELD_MAP = {
  category: 'primaryCategory',
  dateAdded: 'publishedAt',
  tags: 'categories (or remove)',
  slug: '(not in Astro schema, remove)',
  group: '(not in Astro schema, remove)',
};

/**
 * Validate frontmatter against the Astro tools content schema.
 * Returns { valid: true } or { valid: false, errors: string[] }
 *
 * @param {Object} frontmatter - The frontmatter JSONB from directory_entries
 * @returns {{ valid: boolean, errors?: string[] }}
 */
function validateFrontmatter(frontmatter) {
  const errors = [];

  if (!frontmatter || typeof frontmatter !== 'object') {
    return { valid: false, errors: ['Frontmatter is empty or not an object'] };
  }

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (frontmatter[field] === undefined || frontmatter[field] === null || frontmatter[field] === '') {
      // Check if they have the old-schema equivalent
      const oldKey = Object.entries(OLD_FIELD_MAP).find(([, v]) => v === field)?.[0];
      if (oldKey && frontmatter[oldKey] !== undefined) {
        errors.push(`Missing required field "${field}" (found old field "${oldKey}" — needs migration)`);
      } else {
        errors.push(`Missing required field "${field}"`);
      }
    }
  }

  // Validate categories is a non-empty array
  if (frontmatter.categories && !Array.isArray(frontmatter.categories)) {
    errors.push('"categories" must be an array');
  } else if (Array.isArray(frontmatter.categories) && frontmatter.categories.length === 0) {
    errors.push('"categories" must have at least 1 item');
  }

  // Validate pricing enum
  if (frontmatter.pricing && !VALID_PRICING.includes(frontmatter.pricing)) {
    errors.push(`"pricing" must be one of: ${VALID_PRICING.join(', ')} (got "${frontmatter.pricing}")`);
  }

  // Warn about old-schema fields
  for (const oldField of Object.keys(OLD_FIELD_MAP)) {
    if (frontmatter[oldField] !== undefined) {
      errors.push(`Contains old-schema field "${oldField}" → should be "${OLD_FIELD_MAP[oldField]}"`);
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

/**
 * Sanitize frontmatter: strip fields not in the Astro schema.
 * This prevents old-schema fields from leaking into published markdown.
 *
 * @param {Object} frontmatter - Raw frontmatter JSONB
 * @returns {Object} Sanitized frontmatter with only allowed fields
 */
function sanitizeFrontmatter(frontmatter) {
  const clean = {};
  for (const [key, value] of Object.entries(frontmatter)) {
    if (ALLOWED_FIELDS.has(key) && value !== null && value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Generate a YAML frontmatter string from a JSONB object.
 * Handles arrays, booleans, strings, and numbers.
 * Outputs fields in a consistent order for readability.
 *
 * @param {Object} frontmatter - The frontmatter JSONB from directory_entries
 * @returns {string} YAML frontmatter block (with --- delimiters)
 */
function generateFrontmatter(frontmatter) {
  const lines = ['---'];

  // Output in schema order for readability
  const orderedKeys = [
    'name', 'description', 'url', 'logo',
    'primaryCategory', 'categories',
    'aiAutomation', 'pricingTags', 'companySize', 'integrations',
    'pricing', 'priceNote',
    'featured', 'publishedAt', 'updatedAt',
    'upvotes', 'comments', 'views',
    'isNew', 'isVerified', 'hasDeal', 'dealDescription', 'isDiscontinued',
  ];

  const seen = new Set();

  for (const key of orderedKeys) {
    if (frontmatter[key] === null || frontmatter[key] === undefined) continue;
    seen.add(key);
    lines.push(formatYamlField(key, frontmatter[key]));
  }

  // Any remaining fields not in orderedKeys (future-proofing, but only if allowed)
  for (const [key, value] of Object.entries(frontmatter)) {
    if (seen.has(key) || value === null || value === undefined) continue;
    if (ALLOWED_FIELDS.has(key)) {
      lines.push(formatYamlField(key, value));
    }
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Format a single YAML key-value field.
 */
function formatYamlField(key, value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return `${key}: []`;
    const items = value.map(item => `  - "${escapeYaml(String(item))}"`);
    return `${key}:\n${items.join('\n')}`;
  } else if (typeof value === 'boolean') {
    return `${key}: ${value}`;
  } else if (typeof value === 'number') {
    return `${key}: ${value}`;
  } else {
    return `${key}: "${escapeYaml(String(value))}"`;
  }
}

/**
 * Generate a complete Astro-compatible markdown file.
 * Sanitizes frontmatter to strip non-schema fields.
 *
 * @param {Object} frontmatter - JSONB frontmatter from directory_entries
 * @param {string} content - Markdown review body from directory_entries
 * @returns {string} Complete markdown file content
 */
function generateMarkdownFile(frontmatter, content) {
  const clean = sanitizeFrontmatter(frontmatter);
  const fm = generateFrontmatter(clean);
  return `${fm}\n\n${content}\n`;
}

/**
 * Generate the file path for a tool review in the Astro content directory.
 *
 * @param {string} slug - Tool slug from tools table
 * @returns {string} Relative path within the repo
 */
function getToolFilePath(slug) {
  return `fyigtmdotcom/fyigtm-web/src/content/tools/${slug}.md`;
}

/**
 * Generate a URL-safe slug from a name.
 *
 * @param {string} name - Tool name
 * @returns {string} Slug
 */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Escape special characters for YAML string values.
 */
function escapeYaml(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Map a tools table row (snake_case) to Astro-compatible frontmatter (camelCase).
 * This is the canonical tools → directory_entries.frontmatter mapping.
 *
 * @param {Object} tool - Row from tools table
 * @returns {Object} Frontmatter JSONB ready for directory_entries
 */
function buildFrontmatterFromTool(tool) {
  const fm = {};

  // Required fields
  fm.name = tool.name;
  fm.description = tool.summary || tool.best_for || (tool.website_data?.description) || '';
  fm.url = tool.url;
  fm.primaryCategory = tool.primary_category || null;
  fm.categories = Array.isArray(tool.categories) && tool.categories.length > 0
    ? tool.categories
    : (tool.primary_category ? [tool.primary_category] : []);
  fm.publishedAt = new Date().toISOString();

  // Logo: screenshot_url (OG image or favicon) → fallback to Google favicon
  if (tool.screenshot_url) {
    fm.logo = tool.screenshot_url;
  } else if (tool.url) {
    try {
      fm.logo = `https://www.google.com/s2/favicons?domain=${new URL(tool.url).hostname}&sz=128`;
    } catch { /* skip */ }
  }

  // Taxonomy arrays (snake_case → camelCase)
  if (Array.isArray(tool.ai_automation) && tool.ai_automation.length > 0) fm.aiAutomation = tool.ai_automation;
  if (Array.isArray(tool.pricing_tags) && tool.pricing_tags.length > 0) fm.pricingTags = tool.pricing_tags;
  if (Array.isArray(tool.company_size) && tool.company_size.length > 0) fm.companySize = tool.company_size;
  if (Array.isArray(tool.integrations) && tool.integrations.length > 0) fm.integrations = tool.integrations;

  // Pricing
  if (tool.pricing) fm.pricing = tool.pricing;
  if (tool.price_note) fm.priceNote = tool.price_note;

  // Meta
  if (tool.featured) fm.featured = true;

  // Upvotes from seed
  if (tool.seed_upvotes) fm.upvotes = tool.seed_upvotes;

  return fm;
}

module.exports = {
  generateFrontmatter,
  generateMarkdownFile,
  getToolFilePath,
  slugify,
  validateFrontmatter,
  sanitizeFrontmatter,
  buildFrontmatterFromTool,
  REQUIRED_FIELDS,
  ALLOWED_FIELDS,
};
