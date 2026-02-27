const express = require('express');
const { configDb } = require('../../shared/clients/supabase');

const router = express.Router();

// GET /api/config?scope=... — List config settings for a scope
router.get('/', async (req, res) => {
  const { scope } = req.query;

  let query = configDb
    .from('settings')
    .select('key, value, scope, description, encrypted, updated_at')
    .order('key');

  if (scope) {
    query = query.eq('scope', scope);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/config — Update a single config key
router.put('/', async (req, res) => {
  const { key, value, scope = '_global', description } = req.body;
  if (!key) return res.status(400).json({ error: 'key is required' });

  const { data, error } = await configDb
    .from('settings')
    .upsert({
      key,
      value,
      scope,
      description: description || null,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// PUT /api/config/batch — Batch update config keys
router.put('/batch', async (req, res) => {
  const { settings } = req.body; // Array of { key, value, scope?, description? }
  if (!Array.isArray(settings) || settings.length === 0) {
    return res.status(400).json({ error: 'settings array is required' });
  }

  const rows = settings.map(s => ({
    key: s.key,
    value: s.value,
    scope: s.scope || '_global',
    description: s.description || null,
    updated_at: new Date().toISOString()
  }));

  const { data, error } = await configDb
    .from('settings')
    .upsert(rows)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;
