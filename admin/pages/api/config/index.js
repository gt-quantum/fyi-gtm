import { isAuthenticated } from '../../../lib/auth';
import { orchestratorFetch } from '../../../lib/api';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      const data = await orchestratorFetch(`/api/config?${new URLSearchParams(req.query)}`);
      return res.json(data);
    }
    if (req.method === 'PUT') {
      const data = await orchestratorFetch('/api/config', {
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
