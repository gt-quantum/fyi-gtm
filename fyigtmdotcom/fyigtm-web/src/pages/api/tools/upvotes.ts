import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const slugsParam = url.searchParams.get('slugs');

    if (!slugsParam) {
      return new Response(JSON.stringify({ error: 'Missing slugs parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const slugs = slugsParam.split(',').map(s => s.trim()).filter(Boolean);

    if (slugs.length === 0) {
      return new Response(JSON.stringify({ upvotes: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Limit to prevent abuse
    if (slugs.length > 100) {
      return new Response(JSON.stringify({ error: 'Too many slugs (max 100)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const runtime = (locals as any).runtime;
    const supabase = getSupabaseAdmin(runtime?.env);

    const { data, error } = await supabase
      .from('tool_upvotes')
      .select('tool_slug, vote_count')
      .in('tool_slug', slugs);

    if (error) throw error;

    // Convert to a map of slug -> count
    const upvotes: Record<string, number> = {};
    for (const row of data || []) {
      upvotes[row.tool_slug] = row.vote_count;
    }

    // Fill in 0 for any slugs not found
    for (const slug of slugs) {
      if (!(slug in upvotes)) {
        upvotes[slug] = 0;
      }
    }

    return new Response(JSON.stringify({ upvotes }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Upvotes fetch error:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch upvotes' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
