const express = require('express');
const { supabase } = require('../../shared/clients/supabase');

const router = express.Router();

// --- Topics CRUD ---

// GET /api/newsletter/topics
router.get('/topics', async (req, res) => {
  const { data, error } = await supabase
    .from('newsletter_topics')
    .select('*')
    .order('priority', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/newsletter/topics
router.post('/topics', async (req, res) => {
  const { topic, description, priority = 5, active = true } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  const { data, error } = await supabase
    .from('newsletter_topics')
    .insert([{ topic, description, priority, active }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/newsletter/topics/:id
router.put('/topics/:id', async (req, res) => {
  const updates = {};
  const allowed = ['topic', 'description', 'priority', 'active'];
  for (const f of allowed) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }

  const { data, error } = await supabase
    .from('newsletter_topics')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /api/newsletter/topics/:id
router.delete('/topics/:id', async (req, res) => {
  const { error } = await supabase
    .from('newsletter_topics')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// --- Issues ---

// GET /api/newsletter/issues
router.get('/issues', async (req, res) => {
  const { limit = 50 } = req.query;

  const { data, error } = await supabase
    .from('newsletter_issues')
    .select('*, newsletter_topics(topic)')
    .order('created_at', { ascending: false })
    .limit(parseInt(limit));

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/newsletter/issues/:id
router.get('/issues/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('newsletter_issues')
    .select('*, newsletter_topics(topic)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

module.exports = router;
