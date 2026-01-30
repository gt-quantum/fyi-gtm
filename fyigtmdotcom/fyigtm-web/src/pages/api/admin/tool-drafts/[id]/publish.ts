import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../../lib/supabase';
import { validateToken } from '../../auth';

export const prerender = false;

// This endpoint publishes a tool draft to GitHub as a markdown file
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

    // Fetch the draft
    const { data: draft, error: fetchError } = await supabase
      .from('tool_drafts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (!draft) {
      return new Response(JSON.stringify({ error: 'Draft not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (draft.status !== 'approved' && draft.status !== 'draft') {
      return new Response(JSON.stringify({
        error: 'Draft must be approved before publishing',
        currentStatus: draft.status
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!draft.slug || !draft.generated_content || !draft.frontmatter) {
      return new Response(JSON.stringify({
        error: 'Draft is missing required fields (slug, content, or frontmatter)'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build the markdown file content
    const frontmatterYaml = buildFrontmatter(draft.frontmatter);
    const markdownContent = `---\n${frontmatterYaml}---\n\n${draft.generated_content}`;

    // Get GitHub credentials from environment
    const env = runtime?.env || process.env;
    const githubToken = env.GITHUB_TOKEN;
    const githubRepo = env.GITHUB_REPO || 'gt-quantum/fyi-gtm';
    const githubBranch = env.GITHUB_BRANCH || 'main';

    if (!githubToken) {
      return new Response(JSON.stringify({
        error: 'GitHub token not configured. Set GITHUB_TOKEN environment variable.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Commit the file to GitHub
    const filePath = `fyigtmdotcom/fyigtm-web/src/content/tools/${draft.slug}.md`;

    try {
      await commitToGitHub({
        token: githubToken,
        repo: githubRepo,
        branch: githubBranch,
        path: filePath,
        content: markdownContent,
        message: `Add tool review: ${draft.name || draft.slug}`,
      });
    } catch (githubError: any) {
      return new Response(JSON.stringify({
        error: `GitHub commit failed: ${githubError.message}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update draft status to published
    const { data: updatedDraft, error: updateError } = await supabase
      .from('tool_drafts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      success: true,
      message: `Tool published to ${filePath}`,
      draft: updatedDraft,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: `Failed to publish: ${err.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function buildFrontmatter(data: Record<string, any>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'string') {
      // Escape quotes and wrap in quotes
      lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`);
    }
  }

  return lines.join('\n') + '\n';
}

async function commitToGitHub(options: {
  token: string;
  repo: string;
  branch: string;
  path: string;
  content: string;
  message: string;
}) {
  const { token, repo, branch, path, content, message } = options;
  const apiBase = `https://api.github.com/repos/${repo}`;

  // Check if file already exists (to get its SHA for updates)
  let existingSha: string | null = null;
  try {
    const existingResponse = await fetch(`${apiBase}/contents/${path}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'FYI-GTM-Admin',
      },
    });
    if (existingResponse.ok) {
      const existingData = await existingResponse.json();
      existingSha = existingData.sha;
    }
  } catch {
    // File doesn't exist, that's fine
  }

  // Create or update the file
  // Use btoa for base64 encoding (works in Cloudflare Workers, unlike Buffer)
  const base64Content = btoa(unescape(encodeURIComponent(content)));

  const response = await fetch(`${apiBase}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'FYI-GTM-Admin',
    },
    body: JSON.stringify({
      message,
      content: base64Content,
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `GitHub API error (${response.status})`;
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Response wasn't JSON, use the raw text
      errorMessage = errorText.substring(0, 200) || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
