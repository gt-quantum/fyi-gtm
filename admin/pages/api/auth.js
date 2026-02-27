import { COOKIE_NAME, getSessionToken } from '../../lib/auth';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;
  const expected = process.env.DASHBOARD_PASSWORD || 'admin';

  if (password !== expected) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = getSessionToken();

  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  res.json({ success: true });
}
