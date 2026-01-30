import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

// Create a hash from IP + User-Agent for vote deduplication
async function createVoterHash(ip: string, userAgent: string): Promise<string> {
  const data = `${ip}:${userAgent}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  try {
    const body = await request.json();
    const { slug } = body;

    if (!slug || typeof slug !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid slug' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get IP and User-Agent for deduplication
    const ip = clientAddress ||
               request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('cf-connecting-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const voterHash = await createVoterHash(ip, userAgent);

    const runtime = (locals as any).runtime;
    const supabase = getSupabaseAdmin(runtime?.env);

    // Check if this voter has already voted for this tool
    const { data: existingVote } = await supabase
      .from('tool_votes')
      .select('id')
      .eq('tool_slug', slug)
      .eq('voter_hash', voterHash)
      .single();

    if (existingVote) {
      // Already voted - return current count
      const { data: upvoteData } = await supabase
        .from('tool_upvotes')
        .select('vote_count')
        .eq('tool_slug', slug)
        .single();

      return new Response(JSON.stringify({
        success: true,
        upvotes: upvoteData?.vote_count || 0,
        alreadyVoted: true,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Record the vote
    const { error: voteError } = await supabase
      .from('tool_votes')
      .insert({ tool_slug: slug, voter_hash: voterHash });

    if (voteError) {
      // Unique constraint violation means already voted (race condition)
      if (voteError.code === '23505') {
        const { data: upvoteData } = await supabase
          .from('tool_upvotes')
          .select('vote_count')
          .eq('tool_slug', slug)
          .single();

        return new Response(JSON.stringify({
          success: true,
          upvotes: upvoteData?.vote_count || 0,
          alreadyVoted: true,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw voteError;
    }

    // Increment or create the upvote count
    // First try to get existing record
    const { data: existingUpvote } = await supabase
      .from('tool_upvotes')
      .select('vote_count')
      .eq('tool_slug', slug)
      .single();

    let newCount: number;

    if (existingUpvote) {
      // Increment existing count
      newCount = existingUpvote.vote_count + 1;
      const { error: updateError } = await supabase
        .from('tool_upvotes')
        .update({ vote_count: newCount, updated_at: new Date().toISOString() })
        .eq('tool_slug', slug);

      if (updateError) throw updateError;
    } else {
      // Create new record
      newCount = 1;
      const { error: insertError } = await supabase
        .from('tool_upvotes')
        .insert({ tool_slug: slug, vote_count: 1 });

      if (insertError) {
        // Handle race condition - another request created it first
        if (insertError.code === '23505') {
          const { data: raceData } = await supabase
            .from('tool_upvotes')
            .select('vote_count')
            .eq('tool_slug', slug)
            .single();

          newCount = (raceData?.vote_count || 0) + 1;
          await supabase
            .from('tool_upvotes')
            .update({ vote_count: newCount, updated_at: new Date().toISOString() })
            .eq('tool_slug', slug);
        } else {
          throw insertError;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      upvotes: newCount,
      alreadyVoted: false,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Upvote error:', err);
    return new Response(JSON.stringify({ error: 'Failed to process upvote' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
