import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../../lib/supabase';
import { validateToken } from '../../auth';

export const prerender = false;

// This endpoint triggers AI research for a tool draft
// The actual research is done by the Python script, this just updates status
export const POST: APIRoute = async ({ params, request, locals }) => {
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

    // Update status to researching
    const { data, error } = await supabase
      .from('tool_drafts')
      .update({
        status: 'researching',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // In production, this would trigger the Python research script
    // For now, we just update the status and return
    // The Python script polls for 'researching' status items

    return new Response(JSON.stringify({
      success: true,
      message: 'Research queued. The research script will process this item.',
      draft: data
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to trigger research' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
