import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../../lib/supabase';
import { validateToken } from '../../auth';
import Anthropic from '@anthropic-ai/sdk';

export const prerender = false;

// This endpoint runs the three-step hybrid research pipeline:
// Step 1: Direct scraping (no AI)
// Step 2: AI research review with Haiku (fast, cheap)
// Step 3: Final writing with Sonnet (quality)

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

    // ========== START THREE-STEP PIPELINE ==========
    const logs: string[] = [];
    const toolUrl = draft.url;
    const toolName = draft.name || '';

    logs.push('Starting three-step research pipeline');

    // Update status to researching
    await supabase
      .from('tool_drafts')
      .update({
        status: 'researching',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Get API key
    const anthropicKey = env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // Fetch config
    const { data: config } = await supabase
      .from('tool_review_config')
      .select('*')
      .single();

    // ========== STEP 1: DIRECT SCRAPING ==========
    logs.push('Step 1: Scraping website directly...');

    const scrapedData = await scrapeWebsite(toolUrl);
    logs.push(`Scraped: ${scrapedData.name || 'unnamed'} - ${scrapedData.description?.substring(0, 50) || 'no description'}...`);

    // Fetch logo
    const logoUrl = await fetchLogoUrl(toolUrl);
    if (logoUrl) {
      scrapedData.logo = logoUrl;
      logs.push(`Found logo: ${logoUrl}`);
    }

    // ========== STEP 2: AI RESEARCH REVIEW (HAIKU) ==========
    logs.push('Step 2: AI research review with Haiku...');

    const researchNotes = await runHaikuResearch(anthropic, toolUrl, toolName || scrapedData.name, scrapedData);
    logs.push('Haiku research complete');

    // ========== STEP 3: FINAL WRITING (SONNET) ==========
    logs.push('Step 3: Writing review with Sonnet...');

    const reviewTemplate = config?.review_template || getDefaultTemplate();
    const tone = config?.tone || 'Professional but conversational.';
    const emphasize = config?.emphasize || 'Real user feedback and practical use cases.';
    const avoid = config?.avoid || 'Overly promotional language.';
    const wordCount = config?.word_count_target || 1500;

    const { content, frontmatter } = await runSonnetWriting(
      anthropic,
      toolUrl,
      toolName || scrapedData.name || extractNameFromUrl(toolUrl),
      scrapedData,
      researchNotes,
      reviewTemplate,
      tone,
      emphasize,
      avoid,
      wordCount
    );
    logs.push('Sonnet writing complete');

    // ========== FINALIZE ==========
    const detectedName = frontmatter.name || toolName || scrapedData.name || extractNameFromUrl(toolUrl);
    const slug = frontmatter.slug || generateSlug(detectedName);

    // Merge frontmatter
    frontmatter.name = detectedName;
    frontmatter.slug = slug;
    frontmatter.url = frontmatter.url || toolUrl;
    frontmatter.logo = logoUrl || frontmatter.logo || '';
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
          scraped: scrapedData,
          haiku_research: researchNotes,
          generated_at: new Date().toISOString(),
          pipeline: 'three-step-hybrid',
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

// ========== STEP 1: WEBSITE SCRAPING ==========

async function scrapeWebsite(url: string): Promise<Record<string, any>> {
  const data: Record<string, any> = {
    url,
    scrapedAt: new Date().toISOString(),
  };

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      data.error = `HTTP ${response.status}`;
      return data;
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      data.pageTitle = titleMatch[1].trim();
      // Try to extract name from title (before | or -)
      const namePart = titleMatch[1].split(/[|\-–—]/)[0].trim();
      if (namePart && namePart.length < 50) {
        data.name = namePart;
      }
    }

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    if (descMatch) {
      data.description = descMatch[1].trim();
    }

    // Extract og:description as fallback
    if (!data.description) {
      const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      if (ogDescMatch) {
        data.description = ogDescMatch[1].trim();
      }
    }

    // Extract og:title
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (ogTitleMatch && !data.name) {
      data.name = ogTitleMatch[1].trim();
    }

    // Try to find pricing indicators
    const pricingKeywords = ['free', 'pricing', 'plans', 'premium', 'pro', 'enterprise', 'month', '/mo', 'trial'];
    const lowerHtml = html.toLowerCase();
    data.hasPricingPage = pricingKeywords.some(kw => lowerHtml.includes(kw));

    // Extract any visible h1
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) {
      data.headline = h1Match[1].trim();
    }

    // Count some features indicators
    const featureMatches = html.match(/feature|benefit|capability|solution/gi);
    data.featureMentions = featureMatches ? featureMatches.length : 0;

  } catch (err: any) {
    data.error = err.message;
  }

  return data;
}

async function fetchLogoUrl(toolUrl: string): Promise<string | null> {
  try {
    const url = new URL(toolUrl);
    const domain = url.hostname.replace(/^www\./, '');

    // Try Clearbit first (high quality logos)
    const clearbitUrl = `https://logo.clearbit.com/${domain}`;
    const clearbitResponse = await fetch(clearbitUrl, { method: 'HEAD' });

    if (clearbitResponse.ok) {
      return clearbitUrl;
    }

    // Fallback to Google's favicon service
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch (e) {
    return null;
  }
}

// ========== STEP 2: HAIKU RESEARCH ==========

async function runHaikuResearch(
  anthropic: Anthropic,
  toolUrl: string,
  toolName: string,
  scrapedData: Record<string, any>
): Promise<string> {
  const prompt = `You are a research assistant. I need you to gather information about a software tool.

TOOL: ${toolName || 'Unknown'}
URL: ${toolUrl}

SCRAPED DATA FROM WEBSITE:
${JSON.stringify(scrapedData, null, 2)}

YOUR TASK:
1. Use web search to find:
   - User reviews and ratings (G2, Capterra, Trustpilot)
   - Reddit discussions about this tool
   - Current pricing information
   - Any recent news or updates

2. Verify the scraped data is accurate

3. Output a structured research summary with:
   - Tool name and what it does
   - Pricing (free/freemium/paid and specific tiers if found)
   - Key features (list 3-5)
   - User sentiment summary (what do users like/dislike)
   - Notable reviews or quotes
   - Any concerns or criticisms found

Be factual and concise. This research will be used to write a review.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 2000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }],
    messages: [{ role: 'user', content: prompt }],
  });

  // Extract text from response
  const textParts = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text);

  return textParts.join('\n');
}

// ========== STEP 3: SONNET WRITING ==========

async function runSonnetWriting(
  anthropic: Anthropic,
  toolUrl: string,
  toolName: string,
  scrapedData: Record<string, any>,
  researchNotes: string,
  template: string,
  tone: string,
  emphasize: string,
  avoid: string,
  wordCount: number
): Promise<{ content: string; frontmatter: Record<string, any> }> {
  const prompt = `You are a professional tech product reviewer. Write a comprehensive review based on the research provided.

TOOL: ${toolName}
URL: ${toolUrl}

SCRAPED DATA:
${JSON.stringify(scrapedData, null, 2)}

RESEARCH NOTES:
${researchNotes}

WRITING GUIDELINES:
- Tone: ${tone}
- Emphasize: ${emphasize}
- Avoid: ${avoid}

CRITICAL LENGTH REQUIREMENT:
You MUST write at least ${wordCount} words. This is a hard minimum, not a suggestion.
- Expand each section with specific details, examples, and analysis
- Include user quotes and specific feature descriptions
- Do not summarize briefly - provide comprehensive coverage
- Current target: ${wordCount}+ words (aim for ${Math.round(wordCount * 1.1)} words)

TEMPLATE TO FOLLOW:
${template}

OUTPUT FORMAT - Start your response EXACTLY like this (no preamble):
\`\`\`json
{
  "name": "${toolName}",
  "slug": "${generateSlug(toolName)}",
  "description": "One-line SEO description under 160 chars",
  "pricing": "free|freemium|paid|trial",
  "priceNote": "Brief pricing summary",
  "category": "Primary category",
  "tags": ["tag1", "tag2", "tag3"]
}
\`\`\`

## What is ${toolName}?
[Your review starts here, following the template structure]

Remember: Your review MUST be at least ${wordCount} words. Write comprehensively.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,  // Increased to allow for longer reviews
    messages: [{ role: 'user', content: prompt }],
  });

  // Extract text from response
  const textParts = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text);
  const fullResponse = textParts.join('\n');

  // Parse response
  const { frontmatter, content } = parseResponse(fullResponse);

  return { content, frontmatter };
}

// ========== HELPERS ==========

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

    // Get everything AFTER the JSON block
    const jsonEndIndex = response.indexOf('```', response.indexOf('```json') + 7);
    if (jsonEndIndex !== -1) {
      content = response.substring(jsonEndIndex + 3).trim();
    }
  }

  // Remove any preamble before the first markdown heading
  const headingMatch = content.match(/^[\s\S]*?(##\s+)/);
  if (headingMatch && headingMatch.index !== undefined) {
    const beforeHeading = content.substring(0, headingMatch.index).trim();
    if (beforeHeading.length > 0 && !beforeHeading.startsWith('#')) {
      content = content.substring(headingMatch.index);
    }
  }

  return { frontmatter, content };
}

function getDefaultTemplate(): string {
  return `## What is {Tool Name}?

Brief 2-3 sentence overview of what the tool does and its core value proposition.

### Quick Facts
- **Best for:** [Primary target audience]
- **Pricing:** [Pricing model] - [Price range if known]
- **Standout feature:** [One key differentiator]

## Key Features

### [Feature Category 1]
- What it does and why it matters
- Specific capabilities
- How users benefit

### [Feature Category 2]
- What it does and why it matters
- Specific capabilities
- How users benefit

### [Feature Category 3]
- What it does and why it matters
- Specific capabilities
- How users benefit

## Pricing

Brief overview of pricing model, then break down by tier:

- **Free/Starter:** What's included, limitations
- **Pro/Growth:** Price, key features added
- **Enterprise:** Custom pricing, premium features

Note any free trials, money-back guarantees, or pricing considerations.

## Pros & Cons

### Pros
- **[Pro 1]:** Brief explanation of the benefit
- **[Pro 2]:** Brief explanation of the benefit
- **[Pro 3]:** Brief explanation of the benefit
- **[Pro 4]:** Brief explanation of the benefit

### Cons
- **[Con 1]:** Brief explanation of the limitation
- **[Con 2]:** Brief explanation of the limitation
- **[Con 3]:** Brief explanation of the limitation

## What Users Say

Summary of user sentiment from reviews and discussions. Include specific feedback themes, common praise, and recurring criticisms. Quote actual users when possible.

## Who Is It For?

- **[Audience 1]:** Why this tool fits their needs
- **[Audience 2]:** Why this tool fits their needs
- **[Audience 3]:** Why this tool fits their needs
- **[Audience 4]:** Why this tool fits their needs

## Verdict

**Bottom line:** One sentence summary recommendation.

Balanced final assessment covering strengths, limitations, and who should consider this tool. Be specific about use cases where it excels and where alternatives might be better.`;
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
