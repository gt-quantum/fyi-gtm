import { isAuthenticated } from '../../../../lib/auth';
import { orchestratorFetch } from '../../../../lib/api';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;

  try {
    const data = await orchestratorFetch(`/api/integrations/${id}/test`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
