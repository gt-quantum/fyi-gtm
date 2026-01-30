import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../../lib/supabase';
import { validateToken } from '../../auth';
import Anthropic from '@anthropic-ai/sdk';

export const prerender = false;

// This endpoint runs AI research for a tool draft
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
    const body = await request.json().catch(() => ({}));
    const runResearch = body.runResearch === true;

    const runtime = (locals as any).runtime;
    const env = runtime?.env || process.env;
    const supabase = getSupabaseAdmin(env);

    // Fetch the draft
    const { data: draft, error: fetchError } = await supabase
      .from('tool_drafts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !draft) {
      return new Response(JSON.stringify({ error: 'Draft not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If not running research, just update status
    if (!runResearch) {
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

      return new Response(JSON.stringify({
        success: true,
        message: 'Status updated to researching',
        draft: data
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Run the actual research
    const logs: string[] = [];
    logs.push('Starting research process');

    // Update status to researching
    await supabase
      .from('tool_drafts')
      .update({
        status: 'researching',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    logs.push('Fetching tool review configuration');

    // Fetch config
    const { data: config } = await supabase
      .from('tool_review_config')
      .select('*')
      .single();

    const reviewTemplate = config?.review_template || getDefaultTemplate();
    const tone = config?.tone || 'Professional but conversational.';
    const emphasize = config?.emphasize || 'Real user feedback and practical use cases.';
    const avoid = config?.avoid || 'Overly promotional language.';
    const wordCount = config?.word_count_target || 1500;

    logs.push('Calling Claude API with web search');

    // Call Claude with web search
    const anthropicKey = env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const toolUrl = draft.url;
    const toolName = draft.name || '';

    const prompt = buildResearchPrompt(toolUrl, toolName, reviewTemplate, tone, emphasize, avoid, wordCount);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      messages: [{ role: 'user', content: prompt }],
    });

    logs.push('Processing Claude response');

    // Extract text from response
    const textParts = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text);
    const fullResponse = textParts.join('\n');

    // Parse the response
    const { frontmatter, content } = parseResponse(fullResponse);

    logs.push('Extracting frontmatter and content');

    // Determine name and slug
    const detectedName = frontmatter.name || toolName || extractNameFromUrl(toolUrl);
    const slug = frontmatter.slug || generateSlug(detectedName);

    // Add required frontmatter fields
    frontmatter.name = detectedName;
    frontmatter.slug = slug;
    frontmatter.url = frontmatter.url || toolUrl;
    frontmatter.featured = frontmatter.featured || false;
    frontmatter.isNew = frontmatter.isNew !== false;
    frontmatter.dateAdded = frontmatter.dateAdded || new Date().toISOString().split('T')[0];

    logs.push(`Generated content for: ${detectedName}`);

    // Save to database
    const { data: updatedDraft, error: updateError } = await supabase
      .from('tool_drafts')
      .update({
        name: detectedName,
        slug: slug,
        generated_content: content,
        frontmatter: frontmatter,
        research_data: {
          generated_at: new Date().toISOString(),
          model: 'claude-sonnet-4-20250514',
          web_search_used: true,
        },
        status: 'draft',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    logs.push('Research completed successfully');

    return new Response(JSON.stringify({
      success: true,
      draft: updatedDraft,
      logs: logs,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Research error:', err);

    // Try to update draft with error
    try {
      const runtime = (locals as any).runtime;
      const env = runtime?.env || process.env;
      const supabase = getSupabaseAdmin(env);
      await supabase
        .from('tool_drafts')
        .update({
          status: 'pending',
          error_message: err.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id);
    } catch (e) {
      // Ignore update error
    }

    return new Response(JSON.stringify({
      error: err.message || 'Research failed',
      logs: [`Error: ${err.message}`],
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function buildResearchPrompt(
  toolUrl: string,
  toolName: string,
  template: string,
  tone: string,
  emphasize: string,
  avoid: string,
  wordCount: number
): string {
  return `You are a tech product reviewer. Research and write a comprehensive review of a software tool.

TOOL TO REVIEW:
URL: ${toolUrl}
${toolName ? `Name: ${toolName}` : 'Name: (determine from research)'}

INSTRUCTIONS:
1. Use web search to research this tool thoroughly:
   - Visit the tool's website to understand features and pricing
   - Search for user reviews on G2, Trustpilot, Capterra
   - Search Reddit for real user experiences
   - Look for any recent news or updates about the tool

2. Write a balanced, helpful review based on your research.

WRITING GUIDELINES:
- Tone: ${tone}
- Emphasize: ${emphasize}
- Avoid: ${avoid}
- Target word count: ${wordCount} words

TEMPLATE STRUCTURE TO FOLLOW:
${template}

OUTPUT FORMAT:
First, output frontmatter as a JSON code block with these fields:
\`\`\`json
{
  "name": "Tool Name",
  "slug": "tool-name",
  "description": "One-line SEO description under 160 chars",
  "pricing": "free|freemium|paid|trial",
  "priceNote": "Brief pricing summary",
  "category": "Primary category",
  "tags": ["tag1", "tag2", "tag3"]
}
\`\`\`

Then write the review content in Markdown, following the template structure.

Begin your research and write the review:`;
}

function getDefaultTemplate(): string {
  return `## What is {Tool Name}?
Brief introduction and overview.

## Key Features
- Feature 1
- Feature 2
- Feature 3

## Pricing
Pricing breakdown and tiers.

## Pros & Cons

### Pros
- Pro 1
- Pro 2

### Cons
- Con 1
- Con 2

## What Users Say
Aggregated sentiment from reviews.

## Who Is It For?
Target audience and use cases.

## Verdict
Final assessment and recommendation.`;
}

function parseResponse(response: string): { frontmatter: Record<string, any>; content: string } {
  let frontmatter: Record<string, any> = {};
  let content = response;

  // Extract JSON frontmatter
  const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      frontmatter = JSON.parse(jsonMatch[1].trim());
    } catch (e) {
      // Ignore parse errors
    }
    // Remove JSON block from content
    content = response.replace(/```json[\s\S]*?```/, '').trim();
  }

  return { frontmatter, content };
}

function extractNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const name = hostname.replace(/^www\./, '').split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'Unknown Tool';
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
