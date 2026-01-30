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
      .from('tool_review_config')
      .select('*')
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch tool config' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
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
      .from('tool_review_config')
      .update({
        review_template: body.review_template,
        sections: body.sections,
        default_sources: body.default_sources,
        tone: body.tone,
        emphasize: body.emphasize,
        avoid: body.avoid,
        word_count_target: body.word_count_target,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to update tool config' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
