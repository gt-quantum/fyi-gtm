const COOKIE_NAME = 'fyi_admin_session';

/**
 * Check if request has valid admin session cookie.
 */
export function isAuthenticated(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = match ? match[1] : null;
  return token === getSessionToken();
}

/**
 * Get session token (hash of password for simple auth).
 */
function getSessionToken() {
  const password = process.env.DASHBOARD_PASSWORD || 'admin';
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `session_${Math.abs(hash).toString(36)}`;
}

export { COOKIE_NAME, getSessionToken };
