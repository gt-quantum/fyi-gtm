import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { validateToken } from '../auth';

export const prerender = false;

export const GET: APIRoute = async ({ params, request, locals }) => {
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

    const { data, error } = await supabase
      .from('tool_drafts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch tool draft' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

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

    // Allow updating any of these fields
    if (body.url !== undefined) updateData.url = body.url;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.research_data !== undefined) updateData.research_data = body.research_data;
    if (body.generated_content !== undefined) updateData.generated_content = body.generated_content;
    if (body.frontmatter !== undefined) updateData.frontmatter = body.frontmatter;
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url;
    if (body.screenshots !== undefined) updateData.screenshots = body.screenshots;
    if (body.extra_sources !== undefined) updateData.extra_sources = body.extra_sources;
    if (body.custom_sections !== undefined) updateData.custom_sections = body.custom_sections;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.error_message !== undefined) updateData.error_message = body.error_message;
    if (body.published_at !== undefined) updateData.published_at = body.published_at;

    const { data, error } = await supabase
      .from('tool_drafts')
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
    return new Response(JSON.stringify({ error: 'Failed to update tool draft' }), {
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
      .from('tool_drafts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to delete tool draft' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
