// useAuth.js — silent auth hook for JARVIS single-user infrastructure
/**
 * useAuth
 *
 * Single-user personal infrastructure: no login UI, no toasts, no prompts.
 * On mount, restore an existing Supabase session if present; otherwise
 * silently sign in with credentials baked into .env.local. Any failure is
 * surfaced via the returned `authState === 'error'` for the caller to handle
 * (e.g. Boot.jsx may decide to fall back to localStorage-only mode).
 *
 * authState lifecycle:
 *   initializing -> authenticated         (existing session restored)
 *   initializing -> signing_in -> authenticated   (no session, env creds work)
 *   initializing -> signing_in -> error           (sign-in failed)
 *   initializing -> error                          (getSession failed / env missing)
 *
 * Returns: { session, user, authState, error }
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState('initializing');
  const [error, setError] = useState(null);

  // Guard against React 18 StrictMode double-invoke of effects in dev.
  // signInWithPassword is not idempotent — a second call while the first is
  // in-flight wastes a network round-trip and muddies the auth log.
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function run() {
      if (hasAttemptedRef.current) return;
      hasAttemptedRef.current = true;

      try {
        const { data: { session: existing }, error: getErr } =
          await supabase.auth.getSession();

        if (getErr) throw getErr;

        if (existing) {
          if (!isMounted) return;
          setSession(existing);
          setUser(existing.user);
          setAuthState('authenticated');
          if (import.meta.env.DEV) {
            console.log('[JARVIS] Existing Supabase session restored', {
              userId: existing.user?.id,
            });
          }
          return;
        }

        if (!isMounted) return;
        setAuthState('signing_in');

        const email = import.meta.env.VITE_JARVIS_EMAIL;
        const password = import.meta.env.VITE_JARVIS_PASSWORD;

        if (!email || !password) {
          throw new Error(
            '[useAuth] Missing VITE_JARVIS_EMAIL or VITE_JARVIS_PASSWORD in .env.local'
          );
        }

        const { data, error: signInErr } =
          await supabase.auth.signInWithPassword({ email, password });

        if (!isMounted) return;

        if (signInErr) throw signInErr;

        setSession(data.session);
        setUser(data.user);
        setAuthState('authenticated');
        if (import.meta.env.DEV) {
          console.log('[JARVIS] Silent sign-in succeeded', {
            userId: data.user?.id,
          });
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err);
        setAuthState('error');
        if (import.meta.env.DEV) {
          console.error('[JARVIS] Auth failed', err);
        }
      }
    }

    run();

    // Refresh-token rotation + cross-tab sync. SIGNED_OUT resets to a clean
    // unauthenticated state so the next mount can re-attempt sign-in.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!isMounted) return;
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setAuthState('initializing');
          setError(null);
          hasAttemptedRef.current = false;
          return;
        }
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, user, authState, error };
}

export default useAuth;
