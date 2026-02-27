# FYI GTM — Implementation Plan

> Generated 2026-02-27. Audit verified against live Supabase (project ffnznefaxwwcogazbcad).

---

## Part 1: Supabase Audit Results

### Current Tables (all public schema, no RLS, no tracked migrations)

| Table | Rows | Purpose |
|-------|------|---------|
| `tool_drafts` | 53 (52 published, 1 draft) | Research + content fused in one row |
| `newsletter_runs` | 46 (31 published, 15 failed) | Run history, FK to topics |
| `newsletter_config` | 1 | Newsletter structure/tone/avoid coaching |
| `tool_review_config` | 1 | Review template, sections, sources |
| `newsletter_topics` | 37 | Topic backlog with priority/active |
| `tech_backlog` | 13 | Tool URL research queue |
| `tips_backlog` | 0 | Empty |
| `tool_upvotes` | 53 | Seed upvote counts by slug |
| `tool_votes` | 35 | Individual voter records |

### Actual Data Structures

**tool_drafts.research_data** (JSONB, all 53 rows identical structure):
```json
{
  "scraped": {
    "url": "https://www.vector.co/",
    "logo": "https://www.google.com/s2/favicons?domain=vector.co&sz=128",
    "name": "Vector",
    "pageTitle": "Vector — Contact-level advertising",
    "scrapedAt": "2026-01-30T20:53:59.628Z",
    "description": "Uncover the real people looking to buy...",
    "hasPricingPage": true,
    "featureMentions": 4
  },
  "haiku_research": "plain text blob ~2400 chars — unstructured AI research",
  "pipeline": "three-step-hybrid",
  "generated_at": "2026-01-30T20:55:16.121Z"
}
```

**tool_drafts.frontmatter** (JSONB, 51/53 have full schema — `vector` and `gong` are sparse):
```json
{
  "url": "https://www.warmly.ai/",
  "logo": "https://www.google.com/s2/favicons?domain=warmly.ai&sz=128",
  "name": "Warmly AI",
  "slug": "warmly-ai",
  "description": "AI-powered platform for...",
  "category": "Marketing Automation",
  "primaryCategory": "intent-signals",
  "categories": ["intent-signals", "ai-sales-assistants", "lead-management"],
  "group": "data-intelligence",
  "tags": ["advertising", "lead-generation", "crm", "ai"],
  "pricing": "enterprise",
  "priceNote": "Starts at $18,000/year...",
  "pricingTags": ["enterprise-pricing"],
  "companySize": ["mid-market", "enterprise"],
  "aiAutomation": ["ai-native"],
  "integrations": ["hubspot", "salesforce", "slack"],
  "featured": false,
  "isNew": true,
  "dateAdded": "2026-01-30",
  "publishedAt": "2026-02-12"
}
```

**Newsletter is always topic-driven**: All 31 published newsletter_runs have a `topic_id` FK to `newsletter_topics`. The tool spotlight is embedded within topic-driven content, not the other way around.

**Sparse tools**: `vector` and `gong` have minimal frontmatter (url, logo, name, slug, tags only). These should be re-run through the Research Agent after Phase 3 to backfill classification fields.

---

## Part 2: Migration Mapping

| Old | New | Strategy |
|-----|-----|----------|
| `tool_drafts` (whole row) | `tools` + `directory_entries` | Split: identity/research → tools, content → directory_entries |
| `tool_drafts.research_data->'scraped'` | `tools.website_data` | Direct JSONB copy |
| `tool_drafts.research_data->>'haiku_research'` | `tools.research_blob` | Store as text (unstructured, not decomposable) |
| `tool_drafts.frontmatter` (classification fields) | `tools.category`, `tools.tags`, etc. | Extract typed columns from JSONB |
| `tool_drafts.frontmatter` (full object) | `directory_entries.frontmatter` | Keep full JSONB for Astro compatibility |
| `tool_drafts.generated_content` | `directory_entries.content` | Direct text copy |
| `tool_drafts.logo_url` | `tools.screenshot_url` | Direct copy |
| `newsletter_runs` | `newsletter_issues` | Rename + column changes |
| `newsletter_config` | `config.settings` (scope: `agents/newsletter`) | 1 row → multiple key-value pairs |
| `tool_review_config` | `config.settings` (scope: `agents/directory`) | 1 row → multiple key-value pairs |
| `tech_backlog` | `tools` (research_status='queued') | Migrate 13 rows |
| `tool_upvotes` | Keep as-is | Used by Astro site API |
| `tool_votes` | Keep as-is | Used by Astro site API |
| `newsletter_topics` | Keep as-is | Integrated into newsletter agent flow |
| `tips_backlog` | Keep as-is | Empty, low priority |

### Slug Deduplication
`directory_entries` does NOT have its own `slug` column. The slug lives only on `tools.slug`. Directory entries join through `tool_id → tools.slug` when generating markdown. One source of truth.

### Upvote Display Logic
Database view for the Astro site:
```sql
CREATE VIEW public.tool_vote_counts AS
SELECT
  t.slug,
  COALESCE(t.seed_upvotes, 0) + COALESCE(tu.vote_count, 0) AS total_votes,
  COALESCE(t.seed_upvotes, 0) AS seed_votes,
  COALESCE(tu.vote_count, 0) AS live_votes
FROM public.tools t
LEFT JOIN public.tool_upvotes tu ON tu.tool_slug = t.slug;
```
Astro API endpoints switch from querying `tool_upvotes` directly to querying this view.

---

## Part 3: Implementation Phases

### Phase 1: Database Schema Evolution
**Goal:** New tables in place, data migrated, old tables archived.

See Part 4 for exact SQL.

### Phase 2: Orchestrator + Shared Clients + Minimal Admin
**Goal:** Express server on Railway, shared utility clients, AND a minimal admin that can manage the tool queue and trigger research.

#### Directory Structure
```
fyi-gtm/
├── orchestrator/
│   ├── server.js              # Express: health, API routes
│   ├── discovery.js           # Scan agents/, register in core.automations
│   ├── scheduler.js           # node-cron for Railway agents
│   ├── executor.js            # Run agent execute(), wrap with logging
│   └── package.json
├── shared/
│   ├── clients/
│   │   ├── supabase.js        # Supabase client (service key)
│   │   ├── ai.js              # Unified AI router (Claude, Perplexity)
│   │   ├── anthropic.js       # Claude SDK wrapper
│   │   ├── perplexity.js      # Perplexity search wrapper
│   │   ├── github.js          # GitHub API: batch commit, trigger Actions
│   │   ├── kit.js             # Kit.com v4 API client (with retry for 422)
│   │   └── config.js          # Scoped config lookup (scope → global → env)
│   ├── database/
│   │   ├── queries.js         # createExecution, logStep, completeExecution
│   │   └── schemas/           # SQL reference files
│   └── utils/
│       └── markdown.js        # Frontmatter gen, slug helpers
├── agents/                    # (Phase 3+)
├── admin/                     # Minimal admin (grows each phase)
│   ├── pages/
│   │   ├── index.js           # Dashboard: agent status + pipeline overview
│   │   ├── login.js           # Password auth
│   │   ├── tools.js           # Tool queue: add, view status, trigger research
│   │   └── api/               # auth, trigger, tool CRUD
│   ├── middleware.js
│   ├── next.config.js
│   └── package.json
├── package.json               # Root workspace
└── railway.json
```

### Phase 3: Research Agent
Agent that scrapes/researches a tool and saves structured data to `tools` table.
- `agents/research/index.js`, schedule: manual, runtime: railway
- Scrapes website → website_data; Perplexity search → review_data; AI synthesis → summary, classification
- Updates tools row + sets research_status='complete'
- **Post-ship:** Re-run on `vector` and `gong` to backfill sparse frontmatter
- **Admin additions:** Research trigger button, tool detail view
- **Cleanup:** Remove Astro admin tool-research API endpoints

### Phase 4: Directory Agent
Agent that writes a tool review from research data and creates a directory entry.
- `agents/directory/index.js`, triggered when research_status='complete' + no directory entry
- Loads research + config, generates review via Claude, creates directory_entries row (draft)
- **Admin additions:** Entry list, markdown editor with preview, approve button, pipeline view
- **Cleanup:** Remove Astro admin review generation endpoints

### Phase 5: Bulk Publish Worker
Worker that pushes approved entries to GitHub as markdown in a single commit.
- `workers/bulk-publish/index.js`
- Generates markdown (YAML frontmatter + content body), pushes via GitHub Trees API
- Updates directory_entries: status='published', published_at=now()
- **Admin additions:** Publish page with entry selection
- **Cleanup:** Remove Astro admin publish endpoints

### Phase 6: Newsletter Agent
Weekly agent that writes and schedules a newsletter via Kit.com.
- `agents/newsletter/index.js`, runtime: github-actions (Thursday cron)
- Handles BOTH tool-spotlight AND topic-driven issues (queries newsletter_topics + tools)
- Generates via Claude using structure template from config.settings
- Pushes to Kit.com, schedules for Friday
- **Admin additions:** Newsletter calendar, issue editor, config editor, topic management
- **Cleanup:** Remove entire `newsletter/` Python directory, old GitHub Actions workflow

### Phase 7: Admin Polish + Content Agent (Future)
- @xyflow/react flow diagrams, execution step logs viewer, global config editor
- Content Agent: reads tools + directory + newsletter, writes video scripts/social/blog to content_pieces

---

## Part 4: Phase 1 SQL (Exact Migrations)

### Migration 1: Create schemas
```sql
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS config;
```

### Migration 2: core.automations
```sql
CREATE TABLE core.automations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('worker', 'agent')),
  schedule TEXT,
  enabled BOOLEAN DEFAULT true,
  tags TEXT[],
  runtime TEXT DEFAULT 'railway' CHECK (runtime IN ('railway', 'github-actions')),
  flow_definition JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Migration 3: core.executions + core.execution_steps
```sql
CREATE TABLE core.executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id TEXT REFERENCES core.automations(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failure')),
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE core.execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES core.executions(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status TEXT CHECK (status IN ('started', 'completed', 'failed')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_executions_automation ON core.executions(automation_id);
CREATE INDEX idx_executions_started ON core.executions(started_at DESC);
CREATE INDEX idx_steps_execution ON core.execution_steps(execution_id);
```

### Migration 4: config.settings
```sql
CREATE TABLE config.settings (
  key TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT '_global',
  value TEXT NOT NULL,
  description TEXT,
  encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (key, scope)
);
CREATE INDEX idx_settings_scope ON config.settings(scope);
```

### Migration 5: tools table
```sql
CREATE TABLE public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  website_data JSONB,
  research_blob TEXT,
  screenshot_url TEXT,
  pricing_info JSONB,
  summary TEXT,
  linkedin_data JSONB,
  review_data JSONB,
  category TEXT,
  primary_category TEXT,
  categories TEXT[],
  group_name TEXT,
  tags TEXT[],
  pricing TEXT,
  price_note TEXT,
  pricing_tags TEXT[],
  company_size TEXT[],
  ai_automation TEXT[],
  integrations TEXT[],
  seed_upvotes INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  research_status TEXT NOT NULL DEFAULT 'queued'
    CHECK (research_status IN ('queued', 'researching', 'complete', 'failed')),
  research_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tools_slug ON public.tools(slug);
CREATE INDEX idx_tools_research_status ON public.tools(research_status);
```

### Migration 6: directory_entries table
```sql
CREATE TABLE public.directory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES public.tools(id),
  content TEXT,
  frontmatter JSONB,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_directory_tool ON public.directory_entries(tool_id);
CREATE INDEX idx_directory_status ON public.directory_entries(status);
```

### Migration 7: newsletter_issues table
```sql
CREATE TABLE public.newsletter_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID REFERENCES public.tools(id),
  topic_id UUID REFERENCES public.newsletter_topics(id),
  content TEXT,
  subject TEXT,
  preview_text TEXT,
  issue_number INTEGER,
  kit_broadcast_id TEXT,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_newsletter_status ON public.newsletter_issues(status);
CREATE INDEX idx_newsletter_tool ON public.newsletter_issues(tool_id);
CREATE INDEX idx_newsletter_topic ON public.newsletter_issues(topic_id);
```

### Migration 8: content_pieces table
```sql
CREATE TABLE public.content_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES public.tools(id),
  type TEXT NOT NULL CHECK (type IN ('video_script', 'social', 'blog')),
  content TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'used')),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Migration 9: tool_vote_counts view
```sql
CREATE VIEW public.tool_vote_counts AS
SELECT
  t.slug,
  COALESCE(t.seed_upvotes, 0) + COALESCE(tu.vote_count, 0) AS total_votes,
  COALESCE(t.seed_upvotes, 0) AS seed_votes,
  COALESCE(tu.vote_count, 0) AS live_votes
FROM public.tools t
LEFT JOIN public.tool_upvotes tu ON tu.tool_slug = t.slug;
```

### Migration 10: Data migration
```sql
-- Step 1: Populate tools from tool_drafts
INSERT INTO public.tools (
  name, slug, url, website_data, research_blob, screenshot_url,
  category, primary_category, categories, group_name, tags,
  pricing, price_note, pricing_tags, company_size, ai_automation, integrations,
  featured, research_status, research_completed_at, created_at, updated_at
)
SELECT
  COALESCE(td.frontmatter->>'name', td.name, td.slug),
  td.slug,
  COALESCE(td.frontmatter->>'url', td.url),
  td.research_data->'scraped',
  td.research_data->>'haiku_research',
  COALESCE(td.logo_url, td.frontmatter->>'logo'),
  td.frontmatter->>'category',
  td.frontmatter->>'primaryCategory',
  CASE WHEN td.frontmatter ? 'categories'
    THEN ARRAY(SELECT jsonb_array_elements_text(td.frontmatter->'categories'))
    ELSE NULL END,
  td.frontmatter->>'group',
  CASE WHEN td.frontmatter ? 'tags'
    THEN ARRAY(SELECT jsonb_array_elements_text(td.frontmatter->'tags'))
    ELSE NULL END,
  td.frontmatter->>'pricing',
  td.frontmatter->>'priceNote',
  CASE WHEN td.frontmatter ? 'pricingTags'
    THEN ARRAY(SELECT jsonb_array_elements_text(td.frontmatter->'pricingTags'))
    ELSE NULL END,
  CASE WHEN td.frontmatter ? 'companySize'
    THEN ARRAY(SELECT jsonb_array_elements_text(td.frontmatter->'companySize'))
    ELSE NULL END,
  CASE WHEN td.frontmatter ? 'aiAutomation'
    THEN ARRAY(SELECT jsonb_array_elements_text(td.frontmatter->'aiAutomation'))
    ELSE NULL END,
  CASE WHEN td.frontmatter ? 'integrations'
    THEN ARRAY(SELECT jsonb_array_elements_text(td.frontmatter->'integrations'))
    ELSE NULL END,
  COALESCE((td.frontmatter->>'featured')::boolean, false),
  'complete',
  td.published_at,
  td.created_at,
  td.updated_at
FROM public.tool_drafts td
WHERE td.slug IS NOT NULL;

-- Step 2: Migrate seed upvotes into tools
UPDATE public.tools t
SET seed_upvotes = tu.vote_count
FROM public.tool_upvotes tu
WHERE t.slug = tu.tool_slug;

-- Step 3: Populate directory_entries from tool_drafts
INSERT INTO public.directory_entries (
  tool_id, content, frontmatter, image_url, status, published_at, created_at, updated_at
)
SELECT
  t.id,
  td.generated_content,
  td.frontmatter,
  COALESCE(td.logo_url, td.frontmatter->>'logo'),
  CASE WHEN td.status = 'published' THEN 'published' ELSE 'draft' END,
  td.published_at,
  td.created_at,
  td.updated_at
FROM public.tool_drafts td
JOIN public.tools t ON t.slug = td.slug;

-- Step 4: Migrate tech_backlog into tools as queued
INSERT INTO public.tools (name, slug, url, research_status, created_at)
SELECT
  tb.name,
  LOWER(REGEXP_REPLACE(REGEXP_REPLACE(tb.name, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g')),
  tb.url,
  'queued',
  tb.created_at
FROM public.tech_backlog tb
WHERE tb.url IS NOT NULL
ON CONFLICT (slug) DO NOTHING;

-- Step 5: Migrate newsletter_runs to newsletter_issues
INSERT INTO public.newsletter_issues (
  topic_id, content, issue_number, kit_broadcast_id, status, created_at
)
SELECT
  nr.topic_id,
  nr.newsletter_content,
  nr.issue_number,
  nr.beehiiv_post_id,
  CASE
    WHEN nr.status = 'published' THEN 'sent'
    WHEN nr.status = 'failed' THEN 'failed'
    ELSE 'draft'
  END,
  nr.created_at
FROM public.newsletter_runs nr;

-- Step 6: Migrate newsletter_config → config.settings
INSERT INTO config.settings (key, scope, value, description) VALUES
  ('name', 'agents/newsletter', (SELECT name FROM newsletter_config LIMIT 1), 'Newsletter name'),
  ('description', 'agents/newsletter', (SELECT description FROM newsletter_config LIMIT 1), 'Newsletter description'),
  ('audience', 'agents/newsletter', (SELECT audience FROM newsletter_config LIMIT 1), 'Target audience'),
  ('themes', 'agents/newsletter', (SELECT themes FROM newsletter_config LIMIT 1), 'Coverage themes'),
  ('tone', 'agents/newsletter', (SELECT tone FROM newsletter_config LIMIT 1), 'Writing tone'),
  ('avoid', 'agents/newsletter', (SELECT avoid FROM newsletter_config LIMIT 1), 'Patterns to avoid'),
  ('structure', 'agents/newsletter', (SELECT structure FROM newsletter_config LIMIT 1), 'Full structure template');

-- Step 7: Migrate tool_review_config → config.settings
INSERT INTO config.settings (key, scope, value, description) VALUES
  ('review_template', 'agents/directory', (SELECT review_template FROM tool_review_config LIMIT 1), 'Review markdown template'),
  ('review_sections', 'agents/directory', (SELECT sections::text FROM tool_review_config LIMIT 1), 'Review section list'),
  ('review_sources', 'agents/directory', (SELECT default_sources::text FROM tool_review_config LIMIT 1), 'Default research sources'),
  ('tone', 'agents/directory', (SELECT tone FROM tool_review_config LIMIT 1), 'Review writing tone'),
  ('emphasize', 'agents/directory', (SELECT emphasize FROM tool_review_config LIMIT 1), 'What to emphasize'),
  ('avoid', 'agents/directory', (SELECT avoid FROM tool_review_config LIMIT 1), 'Patterns to avoid'),
  ('word_count_target', 'agents/directory', (SELECT word_count_target::text FROM tool_review_config LIMIT 1), 'Target word count');
```

### Migration 11: Verify counts
```sql
SELECT 'tools' as tbl, COUNT(*) FROM public.tools
UNION ALL SELECT 'directory_entries', COUNT(*) FROM public.directory_entries
UNION ALL SELECT 'newsletter_issues', COUNT(*) FROM public.newsletter_issues
UNION ALL SELECT 'config.settings', COUNT(*) FROM config.settings
UNION ALL SELECT 'tools_with_upvotes', COUNT(*) FROM public.tools WHERE seed_upvotes > 0;
-- Expected: tools ~53+backlog, directory_entries 53, newsletter_issues 46, config.settings 14
```

### Migration 12: Archive old tables
```sql
ALTER TABLE public.tool_drafts RENAME TO _archive_tool_drafts;
ALTER TABLE public.newsletter_runs RENAME TO _archive_newsletter_runs;
ALTER TABLE public.newsletter_config RENAME TO _archive_newsletter_config;
ALTER TABLE public.tool_review_config RENAME TO _archive_tool_review_config;
ALTER TABLE public.tech_backlog RENAME TO _archive_tech_backlog;
-- KEEP: tool_upvotes (Astro + view), tool_votes, newsletter_topics, tips_backlog
```

---

## Part 5: Implementation Order

| Order | Phase | Ships With | Effort |
|-------|-------|------------|--------|
| 1 | Phase 1: Schema Migration | — | 1 session |
| 2 | Phase 2: Orchestrator + Shared + Minimal Admin | Tool queue + agent dashboard | 2-3 sessions |
| 3 | Phase 3: Research Agent | + research trigger in admin; re-run on vector/gong | 2-3 sessions |
| 4 | Phase 4: Directory Agent | + entry editor in admin | 1-2 sessions |
| 5 | Phase 5: Bulk Publish Worker | + publish page in admin | 1 session |
| 6 | Phase 6: Newsletter Agent | + newsletter pages in admin | 2 sessions |
| 7 | Phase 7: Admin Polish + Content | Complete admin | 2-3 sessions |

Admin grows incrementally with each phase. No phase ships without its corresponding admin UI.

---

## Part 6: Deprecation Schedule

| Phase | Remove | Reason |
|-------|--------|--------|
| Phase 3 | Astro admin tool-research API endpoints | Replaced by Research Agent + admin |
| Phase 4 | Astro admin review generation endpoints | Replaced by Directory Agent |
| Phase 5 | Astro admin publish endpoints | Replaced by Bulk Publish Worker |
| Phase 6 | `newsletter/` Python directory (all files) | Replaced by Newsletter Agent |
| Phase 6 | `.github/workflows/newsletter.yml` | Replaced by new workflow |
| Phase 6 | Archive tables can be dropped | Data verified in new tables |
| Phase 7 | Remaining Astro `src/pages/api/admin/*` | All admin moved to standalone portal |

Astro public pages and public API endpoints (voting, tool display) are NEVER removed.

---

## Part 7: Environment Variables

### Orchestrator (Railway)
```
SUPABASE_URL=https://ffnznefaxwwcogazbcad.supabase.co
SUPABASE_SERVICE_KEY=...
ANTHROPIC_API_KEY=...
PERPLEXITY_API_KEY=...
GITHUB_TOKEN=...
GITHUB_REPOSITORY=...
KIT_API_KEY=...
PORT=3000
```

### Admin Portal (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
ORCHESTRATOR_URL=https://....railway.app
DASHBOARD_PASSWORD=...
```

### Newsletter Agent (GitHub Actions)
```
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
ANTHROPIC_API_KEY=...
KIT_API_KEY=...
```

---

## Part 8: Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Kit v4 API 422 intermittent | Retry logic in shared/clients/kit.js with exponential backoff |
| 52 existing tools migration | Run in transaction, verify counts before archiving, keep _archive tables |
| research_blob is unstructured text | Keep as-is for existing tools; new Research Agent produces structured fields |
| Astro frontmatter schema drift | directory_entries.frontmatter stores full JSONB; bulk publish generates from it |
| Cloudflare redeploy limits | Bulk publish pattern: never auto-publish one at a time |
| vector + gong sparse frontmatter | Re-run Research Agent on these 2 after Phase 3 ships to backfill |
