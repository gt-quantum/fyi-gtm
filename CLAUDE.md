# FYI GTM — Project Conventions

## Structure
- `orchestrator/` — Express server on Railway (discovery, scheduling, API routes)
- `agents/` — Autonomous AI agents (research, analyst, newsletter, directory)
- `workers/` — One-shot tasks (bulk-publish, scrape)
- `shared/clients/` — AI providers (anthropic, openai, perplexity), supabase, config, github, kit
- `shared/database/` — Execution logging queries (createExecution, logStep, completeExecution)
- `shared/utils/` — Markdown/frontmatter generation
- `admin/` — Next.js 14 admin portal (pages router, dark theme)
- `fyigtmdotcom/` — Astro site on Cloudflare Pages

## Agent Module Pattern
Every agent in `agents/*/index.js` must export:
```js
module.exports = {
  name: 'Agent Name',       // Human-readable
  description: '...',       // What it does
  type: 'agent',            // 'agent' or 'worker'
  schedule: 'manual',       // cron string or 'manual'
  enabled: true,
  tags: [],
  runtime: 'railway',
  flow: { steps: [], edges: [] },  // For admin React Flow visualization
  async validate() {},      // Check env vars, return { valid, errors }
  async execute(context) {} // Main entry. context: { executionId, trigger, runtime, toolId, automations }
};
```
Discovery (`orchestrator/discovery.js`) auto-scans `agents/` and `workers/` folders, validates exports, registers in `core.automations`.

## AI Model Policy
- **Sonnet** — Reserved for writing agents (Directory Writer, Newsletter Writer) only
- **Haiku 4.5** — Classification, summaries, consolidation ($1/$5 per M tokens)
- **GPT-4.1-mini** — Structured JSON extraction ($0.40/$1.60 per M tokens)
- **Perplexity sonar-pro** — Deep web research; **sonar** — targeted factual lookups
- All model assignments configurable via `config.settings` table (no redeployment needed)

## Shared Clients
- `ai.js` — Unified router: `ask('anthropic'|'openai'|'perplexity', params)`
- `anthropic.js` — `ask(params)`, `getText(res)`, `getToolUses(res)`
- `openai.js` — `ask(params)`, `getText(res)`, `getToolCalls(res)`
- `perplexity.js` — `ask(params)`, `getText(res)`, `getCitations(res)`
- `config.js` — `getConfig(key, {scope, default})` with fallback: scope → global → env var
- `supabase.js` — Three clients: `supabase` (public), `coreDb` (core schema), `configDb` (config schema)

## Database
- **tools** — Central hub. research_status: queued→researching→researched→analyzing→complete|failed
- **directory_entries** — Published content (tool_id FK)
- **newsletter_issues** — Newsletter output (topic_id FK)
- **core.executions / core.execution_steps** — Execution logging
- **config.settings** — Key-value config (key + scope composite)

## Agent Chaining
Research Agent → sets research_status='researched' → triggers Analyst Agent in-process via `context.automations`. Analyst → sets research_status='complete', analysis_status='complete'.

## Key Decisions
- 2025-02-27: Separate research (data gathering) from analysis (structuring) — two-agent pipeline
- 2025-02-27: Tools table = central hub; downstream agents read structured fields, never re-parse blobs
- 2025-02-27: Cheapest model per task (Haiku/GPT-4.1-mini), Sonnet reserved for writing
- 2025-02-27: All model choices in config.settings — tune without redeployment
