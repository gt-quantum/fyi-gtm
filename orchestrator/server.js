/**
 * FYI GTM Orchestrator
 *
 * Express server that discovers agents/workers, schedules Railway automations,
 * and exposes API endpoints for the admin portal.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const { discover } = require('./discovery');
const { scheduleAll } = require('./scheduler');
const { execute } = require('./executor');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let automations = [];

// Health check (Railway)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'fyi-gtm-orchestrator',
    automations: automations.length,
    timestamp: new Date().toISOString()
  });
});

// List all discovered automations
app.get('/api/automations', (req, res) => {
  res.json(automations.map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    type: a.type,
    schedule: a.schedule,
    enabled: a.enabled,
    tags: a.tags,
    runtime: a.runtime
  })));
});

// Manually trigger an automation
app.post('/api/automations/:id/trigger', async (req, res) => {
  const id = req.params.id;
  const automation = automations.find(a => a.id === id);

  if (!automation) {
    return res.status(404).json({ error: `Not found: ${id}` });
  }

  // Check enabled status from DB (not stale memory)
  const { coreDb } = require('../shared/clients/supabase');
  const { data: dbRow } = await coreDb
    .from('automations')
    .select('enabled')
    .eq('id', id)
    .single();

  if (dbRow && !dbRow.enabled) {
    return res.status(400).json({ error: `Automation is paused: ${id}` });
  }

  console.log(`[server] Manual trigger: ${automation.name}`);
  const result = await execute(automation, 'manual');
  res.json(result);
});

// Re-scan filesystem and update schedules
app.post('/api/rediscover', async (req, res) => {
  console.log('[server] Re-discovery requested');
  automations = await discover();
  scheduleAll(automations);
  res.json({ automations: automations.length });
});

// ---- Tool CRUD endpoints (for admin) ----
const { supabase } = require('../shared/clients/supabase');

// List tools (with optional status filter)
app.get('/api/tools', async (req, res) => {
  const { status, limit = 100 } = req.query;

  let query = supabase
    .from('tools')
    .select('id, name, slug, url, research_status, category, primary_category, pricing, created_at, updated_at, screenshot_url')
    .order('created_at', { ascending: false })
    .limit(parseInt(limit));

  if (status) {
    query = query.eq('research_status', status);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get single tool
app.get('/api/tools/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// Add a new tool to the queue
app.post('/api/tools', async (req, res) => {
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

// Trigger research for a specific tool
app.post('/api/tools/:id/research', async (req, res) => {
  const toolId = req.params.id;

  // Verify tool exists
  const { data: tool, error: toolErr } = await supabase
    .from('tools')
    .select('id, name, research_status')
    .eq('id', toolId)
    .single();

  if (toolErr || !tool) {
    return res.status(404).json({ error: 'Tool not found' });
  }

  // Reset to queued if re-researching
  if (tool.research_status !== 'queued') {
    await supabase
      .from('tools')
      .update({ research_status: 'queued', updated_at: new Date().toISOString() })
      .eq('id', toolId);
  }

  // Find research agent and trigger with toolId context
  const researchAgent = automations.find(a => a.id === 'agents/research');
  if (!researchAgent) {
    return res.status(500).json({ error: 'Research agent not discovered. Redeploy with agents/research.' });
  }

  console.log(`[server] Research trigger for tool: ${tool.name}`);

  // Execute async — don't block the HTTP response
  const { createExecution, completeExecution } = require('./logger');
  const execution = await createExecution(researchAgent.id);

  res.json({ success: true, executionId: execution.id, tool: tool.name });

  // Run in background
  try {
    const result = await researchAgent._module.execute({
      executionId: execution.id,
      trigger: 'api',
      runtime: 'railway',
      toolId
    });
    await completeExecution(execution.id, 'success', null, result);
  } catch (err) {
    console.error(`[server] Research failed for ${tool.name}:`, err.message);
    await completeExecution(execution.id, 'failure', err.message);
  }
});

// Delete a tool
app.delete('/api/tools/:id', async (req, res) => {
  const { error } = await supabase
    .from('tools')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Recent executions
app.get('/api/executions', async (req, res) => {
  const { coreDb } = require('../shared/clients/supabase');
  const { limit = 20 } = req.query;

  const { data, error } = await coreDb
    .from('executions')
    .select('id, automation_id, started_at, completed_at, duration_ms, status, error, metadata')
    .order('started_at', { ascending: false })
    .limit(parseInt(limit));

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Startup
async function start() {
  try {
    automations = await discover();
    scheduleAll(automations);

    app.listen(PORT, () => {
      console.log(`FYI GTM Orchestrator running on port ${PORT}`);
      console.log(`  ${automations.length} automations discovered`);
      const railway = automations.filter(a => a.runtime === 'railway').length;
      const gha = automations.filter(a => a.runtime === 'github-actions').length;
      console.log(`  ${railway} Railway, ${gha} GitHub Actions`);
    });
  } catch (error) {
    console.error('Failed to start orchestrator:', error);
    process.exit(1);
  }
}

start();
