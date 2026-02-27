const express = require('express');
const { coreDb } = require('../../shared/clients/supabase');
const { execute } = require('../executor');

const router = express.Router();

// GET /api/automations — List all discovered automations
router.get('/', (req, res) => {
  const automations = req.app.locals.automations || [];
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

// GET /api/automations/:id — Single automation detail
router.get('/:id(*)', async (req, res) => {
  const id = req.params.id;

  // Check in-memory discovered automations first
  const automations = req.app.locals.automations || [];
  const inMemory = automations.find(a => a.id === id);

  if (inMemory) {
    // Merge with DB data for editable fields (enabled, schedule, tags)
    const { data: dbRow } = await coreDb
      .from('automations')
      .select('enabled, schedule, tags')
      .eq('id', id)
      .single();

    const merged = {
      id: inMemory.id,
      name: inMemory.name,
      description: inMemory.description,
      type: inMemory.type,
      schedule: dbRow?.schedule || inMemory.schedule,
      enabled: dbRow?.enabled ?? inMemory.enabled,
      tags: dbRow?.tags || inMemory.tags,
      runtime: inMemory.runtime,
      flow_definition: inMemory.flow_definition || null,
    };
    return res.json(merged);
  }

  // Fall back to DB-only for automations no longer on disk
  const { data, error } = await coreDb
    .from('automations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// PUT /api/automations/:id — Toggle enabled/schedule/tags
router.put('/:id(*)', async (req, res) => {
  const id = req.params.id;
  const updates = {};
  const allowed = ['enabled', 'schedule', 'tags'];
  for (const f of allowed) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await coreDb
    .from('automations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // Update in-memory automations
  const automations = req.app.locals.automations || [];
  const idx = automations.findIndex(a => a.id === id);
  if (idx !== -1) {
    Object.assign(automations[idx], updates);
  }

  res.json(data);
});

// GET /api/automations/:id/metadata — Return prompts + operational params
router.get('/:id(*)/metadata', (req, res) => {
  const automations = req.app.locals.automations || [];
  const auto = automations.find(a => a.id === req.params.id);
  if (!auto) return res.status(404).json({ error: 'Not found' });
  res.json({
    prompts: auto._module?.prompts || {},
    operationalParams: auto._module?.operationalParams || {},
  });
});

// POST /api/automations/:id/trigger — Manually trigger
router.post('/:id(*)/trigger', async (req, res) => {
  const id = req.params.id;
  const automations = req.app.locals.automations || [];
  const automation = automations.find(a => a.id === id);

  if (!automation) {
    return res.status(404).json({ error: `Not found: ${id}` });
  }

  const { data: dbRow } = await coreDb
    .from('automations')
    .select('enabled')
    .eq('id', id)
    .single();

  if (dbRow && !dbRow.enabled) {
    return res.status(400).json({ error: `Automation is paused: ${id}` });
  }

  console.log(`[automations] Manual trigger: ${automation.name}`);
  const result = await execute(automation, 'manual');
  res.json(result);
});

module.exports = router;
