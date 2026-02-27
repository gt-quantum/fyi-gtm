const express = require('express');
const { coreDb } = require('../../shared/clients/supabase');

const router = express.Router();

// GET /api/executions — Recent executions
router.get('/', async (req, res) => {
  const { limit = 20, automation_id } = req.query;

  let query = coreDb
    .from('executions')
    .select('id, automation_id, started_at, completed_at, duration_ms, status, error, metadata')
    .order('started_at', { ascending: false })
    .limit(parseInt(limit));

  if (automation_id) {
    query = query.eq('automation_id', automation_id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/executions/:id — Single execution
router.get('/:id', async (req, res) => {
  const { data, error } = await coreDb
    .from('executions')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// GET /api/executions/:id/steps — Execution steps
router.get('/:id/steps', async (req, res) => {
  const { data, error } = await coreDb
    .from('execution_steps')
    .select('*')
    .eq('execution_id', req.params.id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
