-- Newsletter Topics Table
-- Stores topics to be covered in newsletters
CREATE TABLE newsletter_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0,  -- Higher priority = picked first
    active BOOLEAN DEFAULT true,  -- Only active topics are eligible
    used_at TIMESTAMPTZ,  -- When this topic was last used
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Newsletter Runs Table
-- Stores each newsletter generation run
CREATE TABLE newsletter_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_date DATE NOT NULL DEFAULT CURRENT_DATE,
    topic_id UUID REFERENCES newsletter_topics(id),
    research_brief TEXT,  -- Raw research from Claude
    newsletter_content TEXT,  -- Final newsletter content
    beehiiv_post_id TEXT,  -- ID returned from beehiiv API
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, research, writing, published, failed
    error_message TEXT,  -- Error details if failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Index for finding active topics by priority
CREATE INDEX idx_newsletter_topics_active_priority
ON newsletter_topics(priority DESC, created_at ASC)
WHERE active = true AND used_at IS NULL;

-- Index for recent runs
CREATE INDEX idx_newsletter_runs_date
ON newsletter_runs(run_date DESC);

-- Sample topics (customize these!)
INSERT INTO newsletter_topics (topic, description, priority) VALUES
    ('AI agents in enterprise workflows', 'How companies are deploying AI agents for automation', 10),
    ('The state of LLM fine-tuning', 'When and how to fine-tune vs prompt engineering', 9),
    ('Vector databases comparison', 'Comparing Pinecone, Weaviate, Chroma, and others', 8),
    ('RAG architecture patterns', 'Best practices for retrieval-augmented generation', 7),
    ('AI safety and alignment updates', 'Recent developments in AI safety research', 6);
