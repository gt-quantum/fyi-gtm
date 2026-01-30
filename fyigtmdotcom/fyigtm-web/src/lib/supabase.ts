import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin(runtimeEnv?: any) {
  const url = runtimeEnv?.SUPABASE_URL || import.meta.env.SUPABASE_URL;
  const key = runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, key);
}
