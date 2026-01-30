import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { validateToken } from '../auth';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const authHeader = request.headers.get('Authorization');
  if (!validateToken(authHeader)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { id } = params;
    const body = await request.json();
    const runtime = (locals as any).runtime;
    const supabase = getSupabaseAdmin(runtime?.env);

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.tip !== undefined) updateData.tip = body.tip;
    if (body.context !== undefined) updateData.context = body.context;
    if (body.category !== undefined) updateData.category = body.category;

    const { data, error } = await supabase
      .from('tips_backlog')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to update tip' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const authHeader = request.headers.get('Authorization');
  if (!validateToken(authHeader)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { id } = params;
    const runtime = (locals as any).runtime;
    const supabase = getSupabaseAdmin(runtime?.env);

    const { error } = await supabase
      .from('tips_backlog')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to delete tip' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
