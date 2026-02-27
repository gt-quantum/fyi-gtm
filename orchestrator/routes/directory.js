const express = require('express');
const { supabase } = require('../../shared/clients/supabase');
const { generateMarkdownFile, getToolFilePath } = require('../../shared/utils/markdown');
const { batchCommit } = require('../../shared/clients/github');

const router = express.Router();

// GET /api/directory — List all directory entries with tool info
router.get('/', async (req, res) => {
  const { status, limit = 200 } = req.query;

  let query = supabase
    .from('directory_entries')
    .select('id, tool_id, status, frontmatter, created_at, updated_at, tools(name, slug, url, screenshot_url)')
    .order('created_at', { ascending: false })
    .limit(parseInt(limit));

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/directory/:id — Single entry with full content
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('directory_entries')
    .select('*, tools(name, slug, url, screenshot_url)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// PUT /api/directory/:id — Update entry content/frontmatter/status
router.put('/:id', async (req, res) => {
  const updates = {};
  const allowed = ['content', 'frontmatter', 'status'];
  for (const f of allowed) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('directory_entries')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// POST /api/directory/publish — Bulk publish approved entries to GitHub
router.post('/publish', async (req, res) => {
  const { entryIds } = req.body;
  if (!Array.isArray(entryIds) || entryIds.length === 0) {
    return res.status(400).json({ error: 'entryIds array is required' });
  }

  try {
    // Fetch entries with their tool data
    const { data: entries, error } = await supabase
      .from('directory_entries')
      .select('*, tools(name, slug, url)')
      .in('id', entryIds);

    if (error) throw new Error(error.message);
    if (!entries || entries.length === 0) {
      return res.status(404).json({ error: 'No entries found' });
    }

    // Generate markdown files
    const files = [];
    for (const entry of entries) {
      if (!entry.frontmatter || !entry.content || !entry.tools?.slug) {
        console.warn(`[directory] Skipping entry ${entry.id}: missing frontmatter/content/slug`);
        continue;
      }

      const markdown = generateMarkdownFile(entry.frontmatter, entry.content);
      const path = getToolFilePath(entry.tools.slug);
      files.push({ path, content: markdown });
    }

    if (files.length === 0) {
      return res.status(400).json({ error: 'No valid entries to publish' });
    }

    // Batch commit to GitHub
    const result = await batchCommit(
      files,
      `Add/update ${files.length} tool review${files.length > 1 ? 's' : ''} (bulk publish)`,
      'main'
    );

    // Update entries to published status
    await supabase
      .from('directory_entries')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .in('id', entries.map(e => e.id));

    res.json({
      success: true,
      published: files.length,
      commitSha: result.sha,
      commitUrl: result.url
    });
  } catch (err) {
    console.error('[directory] Publish failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
