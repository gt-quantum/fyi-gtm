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
      .from('tool_drafts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify(data || []), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch tool drafts' }), {
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

    // Generate slug from name or URL
    let slug = body.slug;
    if (!slug && body.name) {
      slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    } else if (!slug && body.url) {
      try {
        const domain = new URL(body.url).hostname.replace(/^www\./, '');
        slug = domain.split('.')[0];
      } catch {
        slug = null;
      }
    }

    const { data, error } = await supabase
      .from('tool_drafts')
      .insert({
        url: body.url,
        name: body.name || null,
        slug: slug,
        extra_sources: body.extra_sources || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to create tool draft' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
