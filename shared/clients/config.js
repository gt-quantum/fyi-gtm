const { configDb } = require('./supabase');

const GLOBAL_SCOPE = '_global';

/**
 * Get config value with scoped lookup: scope → global → env fallback.
 *
 * @example
 *   await getConfig('tone', { scope: 'agents/newsletter', default: 'professional' });
 *   await getConfig('anthropic_api_key', process.env.ANTHROPIC_API_KEY);
 */
async function getConfig(key, defaultOrOpts = null) {
  let scope = null;
  let defaultValue = null;

  if (defaultOrOpts && typeof defaultOrOpts === 'object') {
    scope = defaultOrOpts.scope || null;
    defaultValue = defaultOrOpts.default || null;
  } else {
    defaultValue = defaultOrOpts;
  }

  try {
    if (scope) {
      const { data, error } = await configDb
        .from('settings')
        .select('value')
        .eq('key', key)
        .eq('scope', scope)
        .single();

      if (!error && data) return data.value;
    }

    const { data, error } = await configDb
      .from('settings')
      .select('value')
      .eq('key', key)
      .eq('scope', GLOBAL_SCOPE)
      .single();

    if (!error && data) return data.value;

    return defaultValue;
  } catch (error) {
    console.error(`Failed to load config for ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set config value in Supabase.
 *
 * @example
 *   await setConfig('tone', 'direct', { scope: 'agents/newsletter', description: 'Writing tone' });
 */
async function setConfig(key, value, opts = {}) {
  const scope = opts.scope || GLOBAL_SCOPE;

  const { error } = await configDb
    .from('settings')
    .upsert({
      key,
      value,
      scope,
      description: opts.description || null,
      encrypted: opts.encrypted || false,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error(`Failed to set config for ${key}:`, error);
    throw error;
  }
}

module.exports = { getConfig, setConfig, GLOBAL_SCOPE };
