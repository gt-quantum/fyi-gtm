import { isAuthenticated } from '../../../lib/auth';
import { orchestratorFetch } from '../../../lib/api';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = await orchestratorFetch('/api/directory/publish', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
