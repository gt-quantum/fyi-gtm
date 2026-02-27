import { isAuthenticated } from '../../../lib/auth';
import { orchestratorFetch } from '../../../lib/api';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      return res.json(await orchestratorFetch('/api/newsletter/topics'));
    }
    if (req.method === 'POST') {
      const data = await orchestratorFetch('/api/newsletter/topics', {
        method: 'POST',
        body: JSON.stringify(req.body),
      });
      return res.status(201).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
