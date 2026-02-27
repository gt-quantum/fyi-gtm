# Agent Building Guide

## Module Export Contract

Every agent in `agents/*/index.js` must export these fields:

```js
module.exports = {
  name: 'Agent Name',
  description: 'What this agent does',
  type: 'agent',
  schedule: 'manual',          // or cron: '0 9 * * 4'
  enabled: true,
  tags: ['research', 'tools'],
  runtime: 'railway',
  flow: { steps: [...], edges: [...] },
  async validate() { return { valid: true, errors: [] }; },
  async execute(context) { return { processed: 0, failed: 0 }; }
};
```

Required for discovery: `name`, `type`, `execute`. The orchestrator assigns `id` as `agents/{folderName}`.

## Execution Logging

```js
const { createExecution, logStep, completeExecution } = require('../../shared/database/queries');

// In execute(context):
await logStep(executionId, 'step_name', 'started');
// ... do work ...
await logStep(executionId, 'step_name', 'completed', { key: 'value' });
// On error:
await logStep(executionId, 'step_name', 'failed', { error: err.message });
```

Status values: `started`, `completed`, `failed`. Metadata is JSONB — use for token counts, item counts, model used.

## Model Selection

| Task Type | Default Model | Provider | Cost (in/out per M) |
|-----------|--------------|----------|---------------------|
| Deep web research | sonar-pro | perplexity | $3/$15 |
| Targeted web lookup | sonar | perplexity | $1/$1 |
| Structured JSON extraction | gpt-4.1-mini | openai | $0.40/$1.60 |
| Classification/taxonomy | claude-haiku-4-5 | anthropic | $1/$5 |
| Short summaries | claude-haiku-4-5 | anthropic | $1/$5 |
| Content writing | claude-sonnet-4 | anthropic | $3/$15 |

All configurable via `config.settings`:
```js
const model = await getConfig('analyst_extraction_model', 'gpt-4.1-mini');
const provider = await getConfig('analyst_extraction_provider', 'openai');
```

## Prompt Patterns

### Strict JSON output
```
Temperature: 0.1-0.2
System prompt: "Output ONLY valid JSON. No markdown, no explanation."
Parsing: const match = text.match(/\{[\s\S]*\}/); JSON.parse(match[0]);
```

### Classification (constrained)
```
Temperature: 0.1
Provide enum lists in prompt. Example: "Pick ONE from: free, freemium, starter..."
```

### Summaries
```
Temperature: 0.3
Constrain length: "Write exactly 1-2 sentences."
```

## Error Handling

- Mark tool as `failed` status on unrecoverable errors — don't block the queue
- Log the error in execution steps with metadata
- Continue processing remaining tools in the batch
- Never retry in a loop — fail fast, investigate later

## Agent Chaining

Research → Analyst chaining via automations context:

```js
// Research agent triggers analyst after completing research:
const analyst = context.automations?.find(a => a.id === 'agents/analyst');
if (analyst) {
  const exec = await createExecution('agents/analyst');
  analyst._module.execute({ executionId: exec.id, trigger: 'agent-chain', toolId, automations: context.automations });
}
```

## Config System

```js
const { getConfig } = require('../../shared/clients/config');

// Lookup chain: scope → global → default
const model = await getConfig('research_perplexity_main_model', {
  scope: 'agents/research',
  default: 'sonar-pro'
});
```

API keys stay as env vars (never in DB). Model names, prompts, and thresholds go in config.settings.

## JSONB Conventions

- Arrays default to `'[]'::jsonb`
- Objects default to `'{}'::jsonb`
- Always validate schema before writing — use code-level checks, not DB constraints
- Store confidence scores (0.0-1.0) alongside extracted data

## Status Flows

### Research Pipeline
```
queued → researching → researched → analyzing → complete
              ↘ failed                   ↘ failed
```

### Analysis
```
pending → queued → analyzing → complete
                        ↘ failed
```
