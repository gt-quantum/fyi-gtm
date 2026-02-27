/**
 * API client for the orchestrator.
 * All requests go through /api/proxy to avoid CORS issues and attach auth.
 */

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3000';

/**
 * Server-side fetch to orchestrator (used in getServerSideProps and API routes).
 */
export async function orchestratorFetch(path, options = {}) {
  const url = `${ORCHESTRATOR_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Orchestrator ${res.status}: ${text}`);
  }

  return res.json();
}
