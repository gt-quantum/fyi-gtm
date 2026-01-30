-- Tool Upvotes System
-- Stores aggregate upvote counts per tool and tracks individual votes for deduplication

-- Store aggregate upvote counts per tool
CREATE TABLE tool_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_slug TEXT NOT NULL UNIQUE,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track individual votes for deduplication
CREATE TABLE tool_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_slug TEXT NOT NULL,
  voter_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tool_slug, voter_hash)
);

-- Index for efficient lookups by slug
CREATE INDEX idx_tool_votes_slug ON tool_votes(tool_slug);
CREATE INDEX idx_tool_upvotes_slug ON tool_upvotes(tool_slug);
