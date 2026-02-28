const express = require('express');
const { supabase } = require('../../shared/clients/supabase');
const { generateMarkdownFile, getToolFilePath, validateFrontmatter } = require('../../shared/utils/markdown');
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

// POST /api/directory/publish — Bulk publish entries to GitHub
// Validates every entry's frontmatter against Astro schema before pushing.
// Rejects the entire batch if ANY entry fails validation.
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

    // Validate ALL entries before publishing any
    const validationErrors = [];
    const validEntries = [];

    for (const entry of entries) {
      const toolName = entry.tools?.name || entry.id;
      const slug = entry.tools?.slug;

      if (!entry.frontmatter || !entry.content || !slug) {
        validationErrors.push({
          tool: toolName,
          errors: ['Missing frontmatter, content, or slug'],
        });
        continue;
      }

      const validation = validateFrontmatter(entry.frontmatter);
      if (!validation.valid) {
        validationErrors.push({
          tool: toolName,
          slug,
          errors: validation.errors,
        });
      } else {
        validEntries.push(entry);
      }
    }

    // If ANY entry fails validation, reject the entire batch
    if (validationErrors.length > 0) {
      console.error('[directory] Publish blocked — frontmatter validation failed:');
      validationErrors.forEach(e => {
        console.error(`  ${e.tool}: ${e.errors.join('; ')}`);
      });

      return res.status(400).json({
        error: 'Frontmatter validation failed — publish blocked to prevent broken Astro builds',
        failures: validationErrors,
        hint: 'Fix the frontmatter in these directory entries before publishing. Required fields: name, description, url, primaryCategory, categories, publishedAt',
      });
    }

    // Generate markdown files (sanitizeFrontmatter runs inside generateMarkdownFile)
    const files = [];
    for (const entry of validEntries) {
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
      .in('id', validEntries.map(e => e.id));

    res.json({
      success: true,
      published: files.length,
      commitSha: result.sha,
      commitUrl: result.url,
    });
  } catch (err) {
    console.error('[directory] Publish failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/directory/write — Trigger Directory Writer agent for selected tools
// Used for manual retriggers, regeneration after config changes, or writing after failed attempts.
router.post('/write', async (req, res) => {
  const { toolIds } = req.body;
  if (!Array.isArray(toolIds) || toolIds.length === 0) {
    return res.status(400).json({ error: 'toolIds array is required' });
  }

  try {
    // Set directory_status = 'queued' for each tool
    const { error: updateErr } = await supabase
      .from('tools')
      .update({ directory_status: 'queued', updated_at: new Date().toISOString() })
      .in('id', toolIds);

    if (updateErr) throw new Error(updateErr.message);

    // Find and trigger the Directory Writer agent
    const automations = req.app.locals.automations || [];
    const directoryAgent = automations.find(a => a.id === 'agents/directory');
    if (!directoryAgent) {
      return res.status(500).json({ error: 'Directory Writer agent not discovered.' });
    }

    const { createExecution, completeExecution } = require('../logger');
    const execution = await createExecution(directoryAgent.id);

    // Respond immediately — writing runs async
    res.json({ success: true, executionId: execution.id, count: toolIds.length });

    // Fire and forget
    directoryAgent._module.execute({
      executionId: execution.id,
      trigger: 'api',
      runtime: 'railway',
      automations,
    }).then(result => {
      completeExecution(execution.id, 'success', null, result);
    }).catch(err => {
      console.error('[directory] Write failed:', err.message);
      completeExecution(execution.id, 'failure', err.message);
    });
  } catch (err) {
    console.error('[directory] Write trigger error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// POST /api/directory/generate — Generate a directory entry from a tool's structured data
// Maps tool fields (snake_case) → Astro frontmatter (camelCase)
router.post('/generate', async (req, res) => {
  const { toolId } = req.body;
  if (!toolId) return res.status(400).json({ error: 'toolId is required' });

  try {
    // Fetch the tool with all structured data
    const { data: tool, error: toolErr } = await supabase
      .from('tools')
      .select('*')
      .eq('id', toolId)
      .single();

    if (toolErr || !tool) return res.status(404).json({ error: 'Tool not found' });

    // Check if analysis is complete enough
    if (!tool.primary_category) {
      return res.status(400).json({
        error: 'Tool missing primary_category — run analyst first',
        analysis_status: tool.analysis_status,
      });
    }

    // Check if entry already exists
    const { data: existing } = await supabase
      .from('directory_entries')
      .select('id, status')
      .eq('tool_id', toolId)
      .single();

    if (existing) {
      return res.status(409).json({
        error: 'Directory entry already exists',
        entry_id: existing.id,
        status: existing.status,
      });
    }

    // Build frontmatter from tool fields
    const { buildFrontmatterFromTool } = require('../../shared/utils/markdown');
    const frontmatter = buildFrontmatterFromTool(tool);

    // Validate the generated frontmatter
    const validation = validateFrontmatter(frontmatter);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Generated frontmatter failed validation',
        validationErrors: validation.errors,
        frontmatter,
      });
    }

    // Build placeholder content (Directory Writer agent will replace this)
    const content = buildPlaceholderContent(tool);

    // Create the directory entry
    const { data: entry, error: insertErr } = await supabase
      .from('directory_entries')
      .insert({
        tool_id: toolId,
        frontmatter,
        content,
        status: 'draft',
      })
      .select()
      .single();

    if (insertErr) throw new Error(insertErr.message);

    res.status(201).json(entry);
  } catch (err) {
    console.error('[directory] Generate failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Build placeholder review content from structured tool data.
 * A proper Directory Writer agent would replace this with polished copy.
 */
function buildPlaceholderContent(tool) {
  const sections = [];

  if (tool.summary) sections.push(`${tool.summary}\n`);
  if (tool.best_for) sections.push(`*${tool.best_for}*\n`);

  // Key Features
  if (tool.key_features?.length) {
    sections.push('## Key Features\n');
    for (const f of tool.key_features.slice(0, 8)) {
      const name = f.name || f.feature || 'Feature';
      const desc = f.description || '';
      sections.push(`- **${name}**${desc ? ` — ${desc}` : ''}`);
    }
    sections.push('');
  }

  // Pricing
  if (tool.pricing_info) {
    sections.push('## Pricing\n');
    if (tool.pricing_info.model) sections.push(`Pricing model: ${tool.pricing_info.model}`);
    if (tool.pricing_info.tiers?.length) {
      for (const tier of tool.pricing_info.tiers) {
        const name = tier.name || 'Plan';
        const price = tier.price || tier.amount || '';
        sections.push(`- **${name}**${price ? `: ${price}` : ''}`);
      }
    }
    if (tool.pricing_info.free_trial) sections.push(`\nFree trial: ${tool.pricing_info.free_trial}`);
    sections.push('');
  }

  // Pros & Cons
  if (tool.pros_cons?.pros?.length || tool.pros_cons?.cons?.length) {
    sections.push('## Pros & Cons\n');
    if (tool.pros_cons.pros?.length) {
      sections.push('**Pros:**');
      for (const p of tool.pros_cons.pros.slice(0, 5)) {
        sections.push(`- ${typeof p === 'string' ? p : (p.text || p.description || JSON.stringify(p))}`);
      }
    }
    if (tool.pros_cons.cons?.length) {
      sections.push('\n**Cons:**');
      for (const c of tool.pros_cons.cons.slice(0, 5)) {
        sections.push(`- ${typeof c === 'string' ? c : (c.text || c.description || JSON.stringify(c))}`);
      }
    }
    sections.push('');
  }

  return sections.join('\n') || `Review of ${tool.name} — content pending.`;
}

module.exports = router;
