import { isAuthenticated } from '../../../lib/auth';
import { orchestratorFetch } from '../../../lib/api';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  const parts = req.query.id;
  const isTrigger = parts[parts.length - 1] === 'trigger';
  const id = isTrigger ? parts.slice(0, -1).join('/') : parts.join('/');

  try {
    if (req.method === 'POST' && isTrigger) {
      const data = await orchestratorFetch(`/api/automations/${id}/trigger`, { method: 'POST' });
      return res.json(data);
    }
    if (req.method === 'GET') {
      const data = await orchestratorFetch(`/api/automations/${id}`);
      return res.json(data);
    }
    if (req.method === 'PUT') {
      const data = await orchestratorFetch(`/api/automations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(req.body),
      });
      return res.json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
