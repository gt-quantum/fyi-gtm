import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { validateToken } from './auth';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const authHeader = request.headers.get('Authorization');
  if (!validateToken(authHeader)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const runtime = (locals as any).runtime;
    const supabase = getSupabaseAdmin(runtime?.env);
    const { data, error } = await supabase
      .from('newsletter_runs')
      .select('*, newsletter_topics(topic)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return new Response(JSON.stringify(data || []), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch newsletter runs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
