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
      .from('newsletter_topics')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify(data || []), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch topics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const authHeader = request.headers.get('Authorization');
  if (!validateToken(authHeader)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const runtime = (locals as any).runtime;
    const supabase = getSupabaseAdmin(runtime?.env);

    const { data, error } = await supabase
      .from('newsletter_topics')
      .insert({
        topic: body.topic,
        description: body.description,
        priority: body.priority || 0,
        active: body.active !== false,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to create topic' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
