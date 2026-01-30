-- Tool Review Config Table
-- Stores the tool review template and preferences (single row, like newsletter_config)
CREATE TABLE tool_review_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Structure
    review_template TEXT,           -- Markdown template structure
    sections JSONB,                 -- Required sections: intro, features, pricing, pros_cons, verdict

    -- Research Sources
    default_sources JSONB,          -- ["g2", "trustpilot", "capterra", "reddit", "producthunt"]

    -- Style Preferences
    tone TEXT,                      -- Writing style guidelines
    emphasize TEXT,                 -- What to highlight (positive preferences)
    avoid TEXT,                     -- What to avoid (negative preferences)
    word_count_target INTEGER,      -- Target length

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tool Drafts Table
-- Staging area for tool reviews pending approval/publishing
CREATE TABLE tool_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic Info (from submission)
    url TEXT NOT NULL,              -- Tool website URL
    name TEXT,                      -- Tool name (can be auto-detected)
    slug TEXT,                      -- URL-friendly slug

    -- Research Data (AI-gathered)
    research_data JSONB,            -- Raw research from each source

    -- Generated Content
    generated_content TEXT,         -- AI-written review (Markdown)
    frontmatter JSONB,              -- Structured data for .md file

    -- Images
    logo_url TEXT,                  -- Fetched/uploaded logo
    screenshots JSONB,              -- Array of screenshot URLs

    -- Custom Research (per-tool overrides)
    extra_sources JSONB,            -- Additional URLs to research
    custom_sections JSONB,          -- Extra sections for this tool

    -- Status
    status TEXT DEFAULT 'pending',  -- pending, researching, draft, approved, published
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Index for finding drafts by status
CREATE INDEX idx_tool_drafts_status ON tool_drafts(status, created_at DESC);

-- Index for finding drafts by slug (for uniqueness checks)
CREATE INDEX idx_tool_drafts_slug ON tool_drafts(slug) WHERE slug IS NOT NULL;

-- Insert default config with sensible defaults
INSERT INTO tool_review_config (
    review_template,
    sections,
    default_sources,
    tone,
    emphasize,
    avoid,
    word_count_target
) VALUES (
    '## What is {Tool Name}?
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
Aggregated sentiment from G2, Trustpilot, Reddit.

## Who Is It For?
Target audience and use cases.

## Verdict
Final assessment and recommendation.',
    '["intro", "features", "pricing", "pros_cons", "user_reviews", "target_audience", "verdict"]',
    '["g2", "trustpilot", "capterra", "reddit", "producthunt"]',
    'Professional but conversational. Balanced and fair. Focus on helping readers decide if this tool is right for them.',
    'Real user feedback and sentiment. Practical use cases. Clear pricing information. Specific features and capabilities.',
    'Overly promotional language. Unverified claims. Ignoring legitimate criticisms. Generic filler content.',
    1500
);
