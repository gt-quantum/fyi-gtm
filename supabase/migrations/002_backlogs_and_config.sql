-- Newsletter Config Table
-- Stores the newsletter context/purpose (single row)
CREATE TABLE newsletter_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'FYI GTM',
    description TEXT,  -- What the newsletter is about
    audience TEXT,     -- Who reads it
    themes TEXT,       -- Core topics/themes to focus on
    tone TEXT,         -- Voice/style guidelines
    avoid TEXT,        -- Topics to avoid
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tech Backlog Table
-- Tools/technologies to potentially spotlight
CREATE TABLE tech_backlog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,           -- What it does
    why_relevant TEXT,          -- Why spotlight it now
    url TEXT,                   -- Product URL
    used_at TIMESTAMPTZ,        -- When it was used
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tips Backlog Table
-- Tip ideas to potentially include
CREATE TABLE tips_backlog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tip TEXT NOT NULL,
    context TEXT,               -- Additional context or explanation
    category TEXT,              -- e.g., "outbound", "closing", "prospecting"
    used_at TIMESTAMPTZ,        -- When it was used
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding unused backlog items
CREATE INDEX idx_tech_backlog_unused ON tech_backlog(created_at) WHERE used_at IS NULL;
CREATE INDEX idx_tips_backlog_unused ON tips_backlog(created_at) WHERE used_at IS NULL;

-- Insert default config (UPDATE THIS with your actual context)
INSERT INTO newsletter_config (name, description, audience, themes, tone) VALUES (
    'FYI GTM',
    'A weekly newsletter for go-to-market professionals covering sales technology, actionable tips, and industry insights.',
    'Sales leaders, SDRs, AEs, RevOps, and GTM professionals at B2B companies.',
    'Sales technology, GTM strategy, outbound tactics, sales productivity, revenue operations, B2B sales trends.',
    'Professional but conversational. Actionable and practical. No fluff—get to the point.'
);
