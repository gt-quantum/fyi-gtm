import { isAuthenticated } from '../../../../lib/auth';
import { orchestratorFetch } from '../../../../lib/api';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const data = await orchestratorFetch(`/api/integrations/${id}/test`);
      return res.json(data);
    }
    if (req.method === 'DELETE') {
      const data = await orchestratorFetch(`/api/integrations/${id}`, { method: 'DELETE' });
      return res.json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
