const express = require('express');
const { supabase } = require('../../shared/clients/supabase');

const router = express.Router();

// List tools (with optional status filter)
router.get('/', async (req, res) => {
  const { status, limit = 100 } = req.query;

  let query = supabase
    .from('tools')
    .select('id, name, slug, url, research_status, analysis_status, category, primary_category, group_name, pricing, created_at, updated_at, screenshot_url, newsletter_status, newsletter_priority, tags, company_size, ai_automation')
    .order('created_at', { ascending: false })
    .limit(parseInt(limit));

  if (status) {
    query = query.eq('research_status', status);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Merge entry_status + entry_id from directory_entries
  const { data: entries } = await supabase
    .from('directory_entries')
    .select('id, tool_id, status');

  const entryMap = {};
  if (entries) {
    entries.forEach(e => { entryMap[e.tool_id] = { entry_id: e.id, entry_status: e.status }; });
  }

  const merged = data.map(t => ({
    ...t,
    entry_status: entryMap[t.id]?.entry_status || null,
    entry_id: entryMap[t.id]?.entry_id || null,
  }));

  res.json(merged);
});

// Get single tool (all fields)
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// Add a new tool to the queue
router.post('/', async (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'name and url are required' });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const { data, error } = await supabase
    .from('tools')
    .insert([{ name, slug, url, research_status: 'queued' }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// Update tool fields (classification, metadata)
router.put('/:id', async (req, res) => {
  const allowedFields = [
    'name', 'slug', 'url', 'research_status', 'category', 'primary_category',
    'pricing', 'screenshot_url', 'group_name', 'tags', 'integrations',
    'company_size', 'ai_automation', 'summary',
    'price_note', 'pricing_tags', 'categories', 'seed_upvotes', 'featured',
    'newsletter_status', 'newsletter_priority', 'featured_in_issue_id',
    'analysis_status', 'research_version'
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('tools')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Trigger research for a specific tool
router.post('/:id/research', async (req, res) => {
  const toolId = req.params.id;

  const { data: tool, error: toolErr } = await supabase
    .from('tools')
    .select('id, name, research_status')
    .eq('id', toolId)
    .single();

  if (toolErr || !tool) {
    return res.status(404).json({ error: 'Tool not found' });
  }

  if (tool.research_status !== 'queued') {
    await supabase
      .from('tools')
      .update({ research_status: 'queued', updated_at: new Date().toISOString() })
      .eq('id', toolId);
  }

  const automations = req.app.locals.automations || [];
  const researchAgent = automations.find(a => a.id === 'agents/research');
  if (!researchAgent) {
    return res.status(500).json({ error: 'Research agent not discovered.' });
  }

  console.log(`[tools] Research trigger for: ${tool.name}`);

  const { createExecution, completeExecution } = require('../logger');
  const execution = await createExecution(researchAgent.id);

  res.json({ success: true, executionId: execution.id, tool: tool.name });

  try {
    const result = await researchAgent._module.execute({
      executionId: execution.id,
      trigger: 'api',
      runtime: 'railway',
      toolId,
      automations
    });
    await completeExecution(execution.id, 'success', null, result);
  } catch (err) {
    console.error(`[tools] Research failed for ${tool.name}:`, err.message);
    await completeExecution(execution.id, 'failure', err.message);
  }
});

// Delete a tool
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('tools')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
