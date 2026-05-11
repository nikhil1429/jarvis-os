// supabaseClient.js — JARVIS shared Supabase client
/**
 * JARVIS shared Supabase client.
 *
 * Single-user personal infrastructure (not a SaaS). Created once at module
 * load and reused across the app. The namespaced storage key prevents
 * collision with any other Supabase app served from the same origin
 * (e.g. dashboards opened in the same browser profile).
 *
 * Fail-fast on missing env: better to crash at boot than to silently fall
 * back to anonymous and have RLS quietly reject every write later.
 */

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    '[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storageKey: 'jos-supabase-auth',
    flowType: 'pkce',
  },
});

if (import.meta.env.DEV) {
  console.log('[JARVIS] Supabase client initialised', { url });
}

export default supabase;
