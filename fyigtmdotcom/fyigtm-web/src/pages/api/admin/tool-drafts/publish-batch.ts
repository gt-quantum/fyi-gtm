import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { validateToken } from '../auth';
import { categories, type Category } from '../../../../lib/taxonomy';

export const prerender = false;

interface ToolResult {
  id: string;
  name: string;
  slug: string;
  success: boolean;
  error?: string;
  filePath?: string;
}

interface BatchResult {
  success: boolean;
  totalRequested: number;
  totalSucceeded: number;
  totalFailed: number;
  results: ToolResult[];
  commitSha?: string;
  error?: string;
}

// This endpoint publishes multiple tool drafts to GitHub in a single commit
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
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({
        error: 'Request body must include "ids" array with at least one tool ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Limit batch size to prevent abuse
    const MAX_BATCH_SIZE = 50;
    if (ids.length > MAX_BATCH_SIZE) {
      return new Response(JSON.stringify({
        error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} tools`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const runtime = (locals as any).runtime;
    const env = runtime?.env || process.env;
    const supabase = getSupabaseAdmin(env);

    // Get GitHub credentials
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

    // Fetch all requested drafts
    const { data: drafts, error: fetchError } = await supabase
      .from('tool_drafts')
      .select('*')
      .in('id', ids);

    if (fetchError) {
      throw new Error(`Failed to fetch drafts: ${fetchError.message}`);
    }

    if (!drafts || drafts.length === 0) {
      return new Response(JSON.stringify({
        error: 'No drafts found for provided IDs'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Process each draft and collect results
    const results: ToolResult[] = [];
    const filesToCommit: Array<{ path: string; content: string }> = [];
    const successfulDraftIds: string[] = [];

    for (const draft of drafts) {
      const result: ToolResult = {
        id: draft.id,
        name: draft.name || draft.slug || 'Unknown',
        slug: draft.slug || '',
        success: false,
      };

      // Validate draft status
      if (draft.status !== 'approved' && draft.status !== 'draft' && draft.status !== 'published') {
        result.error = `Invalid status: "${draft.status}". Must be draft, approved, or published.`;
        results.push(result);
        continue;
      }

      // Validate required fields
      if (!draft.slug || !draft.generated_content || !draft.frontmatter) {
        result.error = 'Missing required fields (slug, content, or frontmatter)';
        results.push(result);
        continue;
      }

      try {
        // Build the markdown content (same logic as individual publish)
        const markdownContent = buildMarkdownContent(draft);
        const filePath = `fyigtmdotcom/fyigtm-web/src/content/tools/${draft.slug}.md`;

        filesToCommit.push({ path: filePath, content: markdownContent });
        successfulDraftIds.push(draft.id);

        result.success = true;
        result.filePath = filePath;
        result.slug = draft.slug;
      } catch (err: any) {
        result.error = `Content build failed: ${err.message}`;
      }

      results.push(result);
    }

    // If no files to commit, return early with results
    if (filesToCommit.length === 0) {
      const batchResult: BatchResult = {
        success: false,
        totalRequested: ids.length,
        totalSucceeded: 0,
        totalFailed: results.length,
        results,
        error: 'No valid tools to publish',
      };
      return new Response(JSON.stringify(batchResult), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Commit all files in a single commit using Git Data API
    let commitSha: string;
    try {
      commitSha = await commitMultipleFiles({
        token: githubToken,
        repo: githubRepo,
        branch: githubBranch,
        files: filesToCommit,
        message: `Add/update ${filesToCommit.length} tool reviews (bulk publish)`,
      });
    } catch (githubError: any) {
      // GitHub commit failed - mark all as failed
      for (const result of results) {
        if (result.success) {
          result.success = false;
          result.error = `GitHub commit failed: ${githubError.message}`;
        }
      }

      const batchResult: BatchResult = {
        success: false,
        totalRequested: ids.length,
        totalSucceeded: 0,
        totalFailed: results.length,
        results,
        error: `GitHub commit failed: ${githubError.message}`,
      };
      return new Response(JSON.stringify(batchResult), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update all successful drafts in Supabase
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('tool_drafts')
      .update({
        status: 'published',
        published_at: now,
        updated_at: now,
      })
      .in('id', successfulDraftIds);

    if (updateError) {
      // Log but don't fail - the GitHub commit succeeded
      console.error('Failed to update draft statuses in Supabase:', updateError);
      // Add warning to results
      for (const result of results) {
        if (result.success) {
          result.error = 'Published to GitHub but failed to update database status';
        }
      }
    }

    // Build final response
    const successCount = results.filter(r => r.success).length;
    const batchResult: BatchResult = {
      success: successCount > 0,
      totalRequested: ids.length,
      totalSucceeded: successCount,
      totalFailed: results.length - successCount,
      results,
      commitSha,
    };

    return new Response(JSON.stringify(batchResult), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Batch publish error:', err);
    return new Response(JSON.stringify({
      error: `Batch publish failed: ${err.message}`,
      success: false,
      totalRequested: 0,
      totalSucceeded: 0,
      totalFailed: 0,
      results: [],
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function buildMarkdownContent(draft: any): string {
  // Validate and normalize primaryCategory
  let primaryCategory: Category = draft.frontmatter.primaryCategory;
  if (!primaryCategory || !categories.includes(primaryCategory)) {
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

  const completeFrontmatter = {
    name: draft.frontmatter.name || draft.name || 'Unnamed Tool',
    description: draft.frontmatter.description || '',
    url: draft.frontmatter.url || draft.url,
    primaryCategory: primaryCategory,
    categories: categoriesArray,
    aiAutomation: draft.frontmatter.aiAutomation || [],
    pricingTags: draft.frontmatter.pricingTags || [],
    companySize: draft.frontmatter.companySize || [],
    integrations: draft.frontmatter.integrations || [],
    pricing: draft.frontmatter.pricing || 'freemium',
    ...(draft.frontmatter.priceNote && { priceNote: draft.frontmatter.priceNote }),
    featured: draft.frontmatter.featured ?? false,
    publishedAt: draft.frontmatter.publishedAt || new Date().toISOString().split('T')[0],
    ...(draft.status === 'published' && { updatedAt: new Date().toISOString().split('T')[0] }),
    upvotes: draft.frontmatter.upvotes ?? 0,
    comments: draft.frontmatter.comments ?? 0,
    views: draft.frontmatter.views ?? 0,
    isNew: draft.frontmatter.isNew ?? true,
    isVerified: draft.frontmatter.isVerified ?? false,
    hasDeal: draft.frontmatter.hasDeal ?? false,
    isDiscontinued: draft.frontmatter.isDiscontinued ?? false,
    ...(draft.frontmatter.logo && { logo: draft.frontmatter.logo }),
    ...(draft.frontmatter.dealDescription && { dealDescription: draft.frontmatter.dealDescription }),
  };

  const frontmatterYaml = buildFrontmatter(completeFrontmatter);
  return `---\n${frontmatterYaml}---\n\n${draft.generated_content}`;
}

function buildFrontmatter(data: Record<string, any>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'string') {
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

async function commitMultipleFiles(options: {
  token: string;
  repo: string;
  branch: string;
  files: Array<{ path: string; content: string }>;
  message: string;
}): Promise<string> {
  const { token, repo, branch, files, message } = options;
  const apiBase = `https://api.github.com/repos/${repo}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'FYI-GTM-Admin',
  };

  // Step 1: Get the current commit SHA for the branch
  const refResponse = await fetch(`${apiBase}/git/ref/heads/${branch}`, { headers });
  if (!refResponse.ok) {
    throw new Error(`Failed to get branch ref: ${refResponse.status}`);
  }
  const refData = await refResponse.json();
  const currentCommitSha = refData.object.sha;

  // Step 2: Get the tree SHA from the current commit
  const commitResponse = await fetch(`${apiBase}/git/commits/${currentCommitSha}`, { headers });
  if (!commitResponse.ok) {
    throw new Error(`Failed to get commit: ${commitResponse.status}`);
  }
  const commitData = await commitResponse.json();
  const baseTreeSha = commitData.tree.sha;

  // Step 3: Create blobs for each file
  const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = [];

  for (const file of files) {
    const base64Content = uint8ArrayToBase64(new TextEncoder().encode(file.content));

    const blobResponse = await fetch(`${apiBase}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: base64Content,
        encoding: 'base64',
      }),
    });

    if (!blobResponse.ok) {
      const errorText = await blobResponse.text();
      throw new Error(`Failed to create blob for ${file.path}: ${errorText}`);
    }

    const blobData = await blobResponse.json();
    treeItems.push({
      path: file.path,
      mode: '100644', // Regular file
      type: 'blob',
      sha: blobData.sha,
    });
  }

  // Step 4: Create a new tree with all the files
  const treeResponse = await fetch(`${apiBase}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeItems,
    }),
  });

  if (!treeResponse.ok) {
    const errorText = await treeResponse.text();
    throw new Error(`Failed to create tree: ${errorText}`);
  }

  const treeData = await treeResponse.json();

  // Step 5: Create a new commit
  const newCommitResponse = await fetch(`${apiBase}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: [currentCommitSha],
    }),
  });

  if (!newCommitResponse.ok) {
    const errorText = await newCommitResponse.text();
    throw new Error(`Failed to create commit: ${errorText}`);
  }

  const newCommitData = await newCommitResponse.json();

  // Step 6: Update the branch reference to point to the new commit
  const updateRefResponse = await fetch(`${apiBase}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      sha: newCommitData.sha,
    }),
  });

  if (!updateRefResponse.ok) {
    const errorText = await updateRefResponse.text();
    throw new Error(`Failed to update branch ref: ${errorText}`);
  }

  return newCommitData.sha;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
  return btoa(binString);
}
