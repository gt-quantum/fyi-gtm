const express = require('express');
const integrations = require('../../shared/integrations');
const { supabase } = require('../../shared/clients/supabase');

const router = express.Router();

/**
 * Check which env vars are present (boolean only, never expose values).
 */
function checkEnvVars(vars) {
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

// GET /api/integrations — List all integrations with status
router.get('/', (req, res) => {
  const result = integrations.map(svc => {
    const envStatus = checkEnvVars(svc.envVars);
    const allConfigured = envStatus.every(e => e.configured);
    const anyConfigured = envStatus.some(e => e.configured);

    let status = 'missing';
    if (allConfigured) status = 'configured';
    else if (anyConfigured) status = 'partial';

    return {
      ...svc,
      envStatus,
      status,
    };
  });

  res.json(result);
});

// GET /api/integrations/:id/test — Run a live connection test
router.get('/:id/test', async (req, res) => {
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
