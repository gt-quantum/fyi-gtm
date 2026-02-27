/**
 * Integration defaults — seed data for known services.
 * Stored in config.settings (scope='integrations') once saved via admin.
 * This file provides defaults for first load before any DB rows exist.
 */

const DEFAULTS = [
  {
    id: 'supabase',
    name: 'Supabase',
    type: 'database',
    envVars: ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'],
    description: 'PostgreSQL database, auth, config storage',
    testable: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    type: 'ai',
    envVars: ['ANTHROPIC_API_KEY'],
    description: 'AI synthesis, classification, content generation',
    models: [
      'claude-haiku-4-5-20250514',
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
    ],
    defaultModel: 'claude-haiku-4-5-20250514',
    testable: false,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'ai',
    envVars: ['OPENAI_API_KEY'],
    description: 'AI content generation, embeddings',
    models: [
      'gpt-4o-mini',
      'gpt-4o',
      'gpt-4.1',
      'gpt-4.1-mini',
      'o3-mini',
    ],
    defaultModel: 'gpt-4o-mini',
    testable: false,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    type: 'ai',
    envVars: ['PERPLEXITY_API_KEY'],
    description: 'Web-grounded AI search and research',
    models: [
      'sonar',
      'sonar-pro',
      'sonar-reasoning',
      'sonar-reasoning-pro',
    ],
    defaultModel: 'sonar-pro',
    testable: false,
  },
  {
    id: 'github',
    name: 'GitHub',
    type: 'publish',
    envVars: ['GITHUB_TOKEN', 'GITHUB_REPOSITORY'],
    description: 'Bulk publish to Astro site, trigger workflows',
    testable: true,
  },
  {
    id: 'kit',
    name: 'Kit.com',
    type: 'email',
    envVars: ['KIT_API_KEY'],
    description: 'Newsletter delivery via Kit v4 API',
    testable: true,
  },
];

module.exports = DEFAULTS;
