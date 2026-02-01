import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

const PAGE_SIZE = 20;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const offset = (page - 1) * PAGE_SIZE;

    const runtime = (locals as any).runtime;
    const supabase = getSupabaseAdmin(runtime?.env);

    // Get total count for pagination
    const { count } = await supabase
      .from('newsletter_runs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');

    // Get paginated data including issue_number
    const { data, error } = await supabase
      .from('newsletter_runs')
      .select('id, run_date, issue_number, newsletter_topics(topic), newsletter_content')
      .eq('status', 'published')
      .order('run_date', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    // Build title from issue_number and topic
    const newslettersWithTitle = (data || []).map((newsletter) => {
      const topicName = newsletter.newsletter_topics?.topic;
      const issueNum = newsletter.issue_number;

      let title: string;
      if (issueNum && topicName) {
        title = `FYI GTM #${issueNum}: ${topicName}`;
      } else if (issueNum) {
        title = `FYI GTM #${issueNum}: This Week in GTM`;
      } else if (topicName) {
        title = topicName;
      } else {
        title = 'Newsletter';
      }

      return {
        ...newsletter,
        title
      };
    });

    return new Response(JSON.stringify({
      newsletters: newslettersWithTitle,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / PAGE_SIZE),
        hasMore: offset + PAGE_SIZE < (count || 0)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Newsletter API error:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch newsletter runs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
