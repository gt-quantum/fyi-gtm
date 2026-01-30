import type { APIRoute } from 'astro';

export const prerender = false;

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function createTokenPayload(expiresIn: number = 24 * 60 * 60 * 1000): string {
  const expiry = Date.now() + expiresIn;
  const token = generateToken();
  return btoa(JSON.stringify({ token, expiry }));
}

export function validateToken(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  try {
    const tokenData = authHeader.slice(7);
    const decoded = JSON.parse(atob(tokenData));
    return decoded.expiry > Date.now();
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { password } = body;

    const adminPassword = import.meta.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (password !== adminPassword) {
      return new Response(JSON.stringify({ error: 'Invalid password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = createTokenPayload();

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
