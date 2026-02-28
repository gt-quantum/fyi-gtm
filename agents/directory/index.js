/**
 * Directory Writer Agent — Polished Tool Review Generation
 *
 * Pipeline: Load config → Load tool + structured data → Build prompt →
 * Call Sonnet → Parse output → Upsert directory_entry → Update tool status.
 *
 * Reads structured fields from tools table (set by Analyst Agent).
 * Writes markdown content to directory_entries. Frontmatter is built
 * programmatically via buildFrontmatterFromTool() — the writing model
 * only produces the markdown body.
 *
 * Per AI Model Policy: Sonnet is reserved for writing agents.
 */
const { supabase } = require('../../shared/clients/supabase');
const { logStep } = require('../../shared/database/queries');
const { getConfig } = require('../../shared/clients/config');
const { ask } = require('../../shared/clients/ai');
const { getText } = require('../../shared/clients/anthropic');
const { buildFrontmatterFromTool, validateFrontmatter } = require('../../shared/utils/markdown');
const { buildSystemPrompt, buildUserMessage } = require('./prompts');

module.exports = {
  name: 'Directory Writer',
  description: 'Writes polished tool reviews using Sonnet from structured research data',
  type: 'agent',
  schedule: 'manual',
  enabled: true,
  tags: ['directory', 'writing'],
  runtime: 'railway',

  flow: {
    triggeredBy: ['agents/analyst'],
    steps: [
      { id: 'pick', label: 'Pick Queued Tools', type: 'action', icon: 'database' },
      { id: 'config', label: 'Load Writing Config', type: 'action', icon: 'database' },
      { id: 'write', label: 'Write Review (Sonnet)', type: 'ai', icon: 'sparkle' },
      { id: 'store', label: 'Store Entry', type: 'output', icon: 'check' },
    ],
    edges: [
      { from: 'pick', to: 'config' },
      { from: 'config', to: 'write' },
      { from: 'write', to: 'store' },
    ],
  },

  async validate() {
    const errors = [];
    if (!process.env.ANTHROPIC_API_KEY) errors.push('Missing ANTHROPIC_API_KEY');
    if (!process.env.SUPABASE_URL) errors.push('Missing SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_KEY) errors.push('Missing SUPABASE_SERVICE_KEY');
    return { valid: errors.length === 0, errors };
  },

  async execute(context) {
    const { executionId, toolId } = context;

    // Step 1: Pick tools to write
    await logStep(executionId, 'pick', 'started');

    let query = supabase
      .from('tools')
      .select('*')
      .eq('directory_status', 'queued')
      .order('updated_at', { ascending: true })
      .limit(5);

    // If specific toolId, write just that one
    if (toolId) {
      query = supabase.from('tools').select('*').eq('id', toolId);
    }

    const { data: tools, error: fetchError } = await query;
    if (fetchError) throw new Error(`Failed to fetch tools: ${fetchError.message}`);

    if (!tools || tools.length === 0) {
      await logStep(executionId, 'pick', 'completed', { message: 'No tools queued for writing' });
      return { processed: 0 };
    }

    await logStep(executionId, 'pick', 'completed', { count: tools.length, tools: tools.map(t => t.name) });
    console.log(`[directory-writer] Found ${tools.length} tool(s) to write`);

    // Step 2: Load writing config
    await logStep(executionId, 'config', 'started');

    const config = {
      model: await getConfig('directory_writing_model', { scope: 'agents/directory', default: 'claude-sonnet-4-20250514' }),
      tone: await getConfig('tone', { scope: 'agents/directory', default: '' }),
      emphasize: await getConfig('emphasize', { scope: 'agents/directory', default: '' }),
      avoid: await getConfig('avoid', { scope: 'agents/directory', default: '' }),
      word_count_target: await getConfig('word_count_target', { scope: 'agents/directory', default: '750' }),
      review_template: await getConfig('review_template', { scope: 'agents/directory', default: '' }),
      review_sections: await getConfig('review_sections', { scope: 'agents/directory', default: '' }),
      review_sources: await getConfig('review_sources', { scope: 'agents/directory', default: '' }),
    };

    await logStep(executionId, 'config', 'completed', { model: config.model, word_count_target: config.word_count_target });

    // Process each tool
    let processed = 0;
    let failed = 0;
    const results = [];

    for (const tool of tools) {
      try {
        const result = await writeTool(tool, config, executionId);
        processed++;
        results.push({ tool: tool.name, ...result });
      } catch (err) {
        failed++;
        console.error(`[directory-writer] Failed for ${tool.name}:`, err.message);
        await logStep(executionId, `error_${tool.slug}`, 'failed', { error: err.message });

        await supabase
          .from('tools')
          .update({ directory_status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', tool.id);

        results.push({ tool: tool.name, error: err.message });
      }
    }

    console.log(`[directory-writer] Done: ${processed} written, ${failed} failed`);
    return { processed, failed, results };
  }
};

// ----------------------------------------------------------------
// Write a single tool review
// ----------------------------------------------------------------

async function writeTool(tool, config, executionId) {
  // Mark as writing
  await supabase
    .from('tools')
    .update({ directory_status: 'writing', updated_at: new Date().toISOString() })
    .eq('id', tool.id);

  // Check for analysis data
  if (!tool.primary_category) {
    throw new Error('Tool missing primary_category — run analyst first');
  }

  // Check for existing directory entry (for regeneration)
  const { data: existingEntry } = await supabase
    .from('directory_entries')
    .select('id, status')
    .eq('tool_id', tool.id)
    .single();

  // Step 3: Write review via Sonnet
  await logStep(executionId, 'write', 'started', { tool: tool.name, model: config.model });

  const systemPrompt = buildSystemPrompt(config);
  const userMessage = buildUserMessage(tool, config);

  console.log(`[directory-writer] Writing review: ${tool.name} (model: ${config.model})`);

  const response = await ask('anthropic', {
    model: config.model,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    max_tokens: 4096,
    temperature: 0.6,
  });

  const content = getText(response);
  if (!content || content.length < 100) {
    throw new Error(`Empty or too-short response from model (${content?.length || 0} chars)`);
  }

  // Strip any accidental frontmatter the model might include
  const cleanContent = stripFrontmatter(content);

  await logStep(executionId, 'write', 'completed', {
    tool: tool.name,
    content_length: cleanContent.length,
    input_tokens: response.usage?.input_tokens,
    output_tokens: response.usage?.output_tokens,
  });

  // Step 4: Build frontmatter + store entry
  await logStep(executionId, 'store', 'started', { tool: tool.name });

  const frontmatter = buildFrontmatterFromTool(tool);
  const validation = validateFrontmatter(frontmatter);

  if (!validation.valid) {
    console.warn(`[directory-writer] Frontmatter validation warnings for ${tool.name}:`, validation.errors);
    // Don't fail — store as draft anyway, can be fixed in admin
  }

  // Upsert directory entry
  if (existingEntry) {
    // Update existing entry
    const { error: updateErr } = await supabase
      .from('directory_entries')
      .update({
        frontmatter,
        content: cleanContent,
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingEntry.id);

    if (updateErr) throw new Error(`Failed to update directory entry: ${updateErr.message}`);
    console.log(`[directory-writer] Updated existing entry for ${tool.name} (${existingEntry.id})`);
  } else {
    // Insert new entry
    const { error: insertErr } = await supabase
      .from('directory_entries')
      .insert({
        tool_id: tool.id,
        frontmatter,
        content: cleanContent,
        status: 'draft',
      });

    if (insertErr) throw new Error(`Failed to create directory entry: ${insertErr.message}`);
    console.log(`[directory-writer] Created new entry for ${tool.name}`);
  }

  // Update tool status
  await supabase
    .from('tools')
    .update({
      directory_status: 'complete',
      directory_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', tool.id);

  await logStep(executionId, 'store', 'completed', {
    tool: tool.name,
    entry_action: existingEntry ? 'updated' : 'created',
    frontmatter_valid: validation.valid,
  });

  console.log(`[directory-writer] Completed: ${tool.name}`);

  return {
    content_length: cleanContent.length,
    entry_action: existingEntry ? 'updated' : 'created',
    frontmatter_valid: validation.valid,
    tokens: {
      input: response.usage?.input_tokens,
      output: response.usage?.output_tokens,
    },
  };
}

/**
 * Strip accidental frontmatter from model output.
 * Models sometimes add --- blocks despite instructions.
 */
function stripFrontmatter(content) {
  const trimmed = content.trim();
  if (trimmed.startsWith('---')) {
    const endIdx = trimmed.indexOf('---', 3);
    if (endIdx !== -1) {
      return trimmed.slice(endIdx + 3).trim();
    }
  }
  return trimmed;
}
