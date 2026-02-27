const express = require('express');
const { supabase } = require('../../shared/clients/supabase');

const router = express.Router();

// GET /api/tips
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('tips_backlog')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/tips
router.post('/', async (req, res) => {
  const { tip, context, category } = req.body;
  if (!tip) return res.status(400).json({ error: 'tip is required' });

  const { data, error } = await supabase
    .from('tips_backlog')
    .insert([{ tip, context, category }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/tips/:id
router.put('/:id', async (req, res) => {
  const updates = {};
  const allowed = ['tip', 'context', 'category', 'used'];
  for (const f of allowed) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }

  const { data, error } = await supabase
    .from('tips_backlog')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /api/tips/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('tips_backlog')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
