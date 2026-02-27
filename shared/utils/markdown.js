/**
 * Markdown utilities for generating Astro-compatible tool review files.
 * Used by the Bulk Publish worker to generate markdown from directory_entries.
 */

/**
 * Generate a YAML frontmatter string from a JSONB object.
 * Handles arrays, booleans, strings, and numbers.
 *
 * @param {Object} frontmatter - The frontmatter JSONB from directory_entries
 * @returns {string} YAML frontmatter block (with --- delimiters)
 */
function generateFrontmatter(frontmatter) {
  const lines = ['---'];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - "${escapeYaml(String(item))}"`);
      }
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: "${escapeYaml(String(value))}"`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Generate a complete Astro-compatible markdown file.
 *
 * @param {Object} frontmatter - JSONB frontmatter from directory_entries
 * @param {string} content - Markdown review body from directory_entries
 * @returns {string} Complete markdown file content
 */
function generateMarkdownFile(frontmatter, content) {
  const fm = generateFrontmatter(frontmatter);
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

module.exports = { generateFrontmatter, generateMarkdownFile, getToolFilePath, slugify };
