/**
 * Integration registry — single source of truth for all external services.
 * Used by orchestrator /api/integrations endpoint and admin page.
 */

module.exports = [
  {
    id: 'supabase',
    name: 'Supabase',
    type: 'database',
    envVars: ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'],
    description: 'PostgreSQL database, auth, config storage',
    usedBy: ['all agents'],
    testable: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    type: 'ai',
    envVars: ['ANTHROPIC_API_KEY'],
    description: 'AI synthesis, classification, content generation',
    defaultModel: 'claude-haiku-4-5-20250514',
    usedBy: ['agents/research', 'agents/directory', 'agents/newsletter'],
    testable: false,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'ai',
    envVars: ['OPENAI_API_KEY'],
    description: 'AI content generation, embeddings',
    defaultModel: 'gpt-4o-mini',
    usedBy: ['agents/research'],
    testable: false,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    type: 'ai',
    envVars: ['PERPLEXITY_API_KEY'],
    description: 'Web-grounded AI search and research',
    defaultModel: 'sonar-pro',
    usedBy: ['agents/research'],
    testable: false,
  },
  {
    id: 'github',
    name: 'GitHub',
    type: 'publish',
    envVars: ['GITHUB_TOKEN', 'GITHUB_REPOSITORY'],
    description: 'Bulk publish to Astro site, trigger workflows',
    usedBy: ['agents/directory', 'agents/newsletter'],
    testable: true,
  },
  {
    id: 'kit',
    name: 'Kit.com',
    type: 'email',
    envVars: ['KIT_API_KEY'],
    description: 'Newsletter delivery via Kit v4 API',
    usedBy: ['agents/newsletter'],
    testable: true,
  },
];
