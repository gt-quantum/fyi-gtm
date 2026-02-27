import { isAuthenticated } from '../../lib/auth';
import { orchestratorFetch } from '../../lib/api';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const params = new URLSearchParams(req.query).toString();
    const data = await orchestratorFetch(`/api/executions${params ? '?' + params : ''}`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
