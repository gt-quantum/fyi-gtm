import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../../lib/supabase';
import { validateToken } from '../../auth';
import { categories, type Category } from '../../../../../lib/taxonomy';

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

    if (draft.status !== 'approved' && draft.status !== 'draft' && draft.status !== 'published') {
      return new Response(JSON.stringify({
        error: 'Draft must be in draft, approved, or published status to publish',
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

    // Validate and normalize primaryCategory
    let primaryCategory: Category = draft.frontmatter.primaryCategory;
    if (!primaryCategory || !categories.includes(primaryCategory)) {
      // Fallback to first valid category or default
      const validCats = (draft.frontmatter.categories || []).filter((c: string) => categories.includes(c as Category));
      primaryCategory = validCats[0] || 'workflow-integration';
    }

    // Ensure categories array includes primaryCategory and only valid values
    let categoriesArray: Category[] = (draft.frontmatter.categories || [])
      .filter((c: string) => categories.includes(c as Category)) as Category[];
    if (!categoriesArray.includes(primaryCategory)) {
      categoriesArray = [primaryCategory, ...categoriesArray];
    }
    if (categoriesArray.length === 0) {
      categoriesArray = [primaryCategory];
    }

    // Ensure all required frontmatter fields have values (new schema)
    const completeFrontmatter = {
      // Required fields
      name: draft.frontmatter.name || draft.name || 'Unnamed Tool',
      description: draft.frontmatter.description || '',
      url: draft.frontmatter.url || draft.url,

      // Categorization (new schema)
      primaryCategory: primaryCategory,
      categories: categoriesArray,

      // Structured tags (new schema)
      aiAutomation: draft.frontmatter.aiAutomation || [],
      pricingTags: draft.frontmatter.pricingTags || [],
      companySize: draft.frontmatter.companySize || [],
      integrations: draft.frontmatter.integrations || [],

      // Pricing display
      pricing: draft.frontmatter.pricing || 'freemium',
      ...(draft.frontmatter.priceNote && { priceNote: draft.frontmatter.priceNote }),

      // Meta
      featured: draft.frontmatter.featured ?? false,
      publishedAt: draft.frontmatter.publishedAt || new Date().toISOString().split('T')[0],
      ...(draft.status === 'published' && { updatedAt: new Date().toISOString().split('T')[0] }),

      // Operational
      upvotes: draft.frontmatter.upvotes ?? 0,
      comments: draft.frontmatter.comments ?? 0,
      views: draft.frontmatter.views ?? 0,
      isNew: draft.frontmatter.isNew ?? true,
      isVerified: draft.frontmatter.isVerified ?? false,
      hasDeal: draft.frontmatter.hasDeal ?? false,
      isDiscontinued: draft.frontmatter.isDiscontinued ?? false,

      // Optional fields (only include if present)
      ...(draft.frontmatter.logo && { logo: draft.frontmatter.logo }),
      ...(draft.frontmatter.dealDescription && { dealDescription: draft.frontmatter.dealDescription }),
    };

    // Build the markdown file content
    const frontmatterYaml = buildFrontmatter(completeFrontmatter);
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
    const isRepublish = draft.status === 'published';
    const commitMessage = isRepublish
      ? `Update tool review: ${draft.name || draft.slug}`
      : `Add tool review: ${draft.name || draft.slug}`;

    try {
      await commitToGitHub({
        token: githubToken,
        repo: githubRepo,
        branch: githubBranch,
        path: filePath,
        content: markdownContent,
        message: commitMessage,
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
  // Use TextEncoder + manual base64 for reliable UTF-8 encoding in Cloudflare Workers
  const base64Content = uint8ArrayToBase64(new TextEncoder().encode(content));

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

// Reliable base64 encoding for UTF-8 content in Cloudflare Workers
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
  return btoa(binString);
}
