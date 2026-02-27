const express = require('express');
const DEFAULTS = require('../../shared/integrations');
const { supabase } = require('../../shared/clients/supabase');
const { configDb } = require('../../shared/clients/supabase');

const router = express.Router();

const SCOPE = 'integrations';

/**
 * Load integrations from config.settings, merged with static defaults.
 * DB rows override defaults; new DB-only entries are included too.
 */
async function loadIntegrations() {
  const { data: rows } = await configDb
    .from('settings')
    .select('key, value')
    .eq('scope', SCOPE);

  // Build map of DB overrides (key = integration id, value = JSON)
  const dbMap = {};
  if (rows) {
    rows.forEach(r => {
      try {
        dbMap[r.key] = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
      } catch {
        // skip malformed
      }
    });
  }

  // Merge: defaults + DB overrides
  const seen = new Set();
  const merged = DEFAULTS.map(def => {
    seen.add(def.id);
    const override = dbMap[def.id];
    return override ? { ...def, ...override, id: def.id } : { ...def };
  });

  // Add DB-only integrations (user-created)
  Object.entries(dbMap).forEach(([id, data]) => {
    if (!seen.has(id)) {
      merged.push({ id, ...data });
    }
  });

  return merged;
}

/**
 * Check which env vars are present (boolean only, never expose values).
 */
function checkEnvVars(vars) {
  if (!Array.isArray(vars)) return [];
  return vars.map(name => ({
    name,
    configured: !!process.env[name],
  }));
}

/**
 * Run a lightweight health check for a testable service.
 */
async function testService(id) {
  const start = Date.now();

  switch (id) {
    case 'supabase': {
      const { data, error } = await supabase.from('tools').select('id').limit(1);
      if (error) throw new Error(error.message);
      return { ok: true, latency: Date.now() - start, detail: `${data.length} row returned` };
    }
    case 'github': {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const user = await res.json();
      return { ok: true, latency: Date.now() - start, detail: `Authenticated as ${user.login}` };
    }
    case 'kit': {
      const res = await fetch('https://api.kit.com/v4/account', {
        headers: {
          'Authorization': `Bearer ${process.env.KIT_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      if (!res.ok) throw new Error(`Kit API ${res.status}`);
      return { ok: true, latency: Date.now() - start, detail: 'Account accessible' };
    }
    default:
      throw new Error(`No test available for ${id}`);
  }
}

// GET /api/integrations — List all integrations with live env var status
router.get('/', async (req, res) => {
  try {
    const integrations = await loadIntegrations();

    const result = integrations.map(svc => {
      const envStatus = checkEnvVars(svc.envVars);
      const allConfigured = envStatus.length > 0 && envStatus.every(e => e.configured);
      const anyConfigured = envStatus.some(e => e.configured);

      let status = 'missing';
      if (allConfigured) status = 'configured';
      else if (anyConfigured) status = 'partial';
      if (envStatus.length === 0) status = 'no_keys';

      return { ...svc, envStatus, status };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations — Create or update an integration (save to config.settings)
router.post('/', async (req, res) => {
  const { id, name, type, description, envVars, models, defaultModel, testable } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name are required' });

  const payload = { name, type: type || 'other', description: description || '' };
  if (envVars) payload.envVars = envVars;
  if (models) payload.models = models;
  if (defaultModel) payload.defaultModel = defaultModel;
  if (testable !== undefined) payload.testable = testable;

  try {
    const { data, error } = await configDb
      .from('settings')
      .upsert({
        key: id,
        scope: SCOPE,
        value: JSON.stringify(payload),
        description: `Integration: ${name}`,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ id, ...payload, saved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/integrations/:id — Remove a user-created integration from config.settings
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await configDb
      .from('settings')
      .delete()
      .eq('key', id)
      .eq('scope', SCOPE);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ id, deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/integrations/:id/test — Run a live connection test
router.get('/:id/test', async (req, res) => {
  const integrations = await loadIntegrations();
  const svc = integrations.find(s => s.id === req.params.id);
  if (!svc) return res.status(404).json({ error: 'Integration not found' });
  if (!svc.testable) return res.status(400).json({ error: 'Service does not support testing' });

  try {
    const result = await testService(svc.id);
    res.json({ id: svc.id, ...result });
  } catch (err) {
    res.json({ id: svc.id, ok: false, error: err.message });
  }
});

module.exports = router;
