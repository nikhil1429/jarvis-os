// useAuth.js — silent auth hook for JARVIS single-user infrastructure
/**
 * useAuth
 *
 * Single-user personal infrastructure: no login UI, no toasts, no prompts.
 * On mount, restore an existing Supabase session if present; otherwise
 * silently sign in with credentials baked into .env.local. Any failure is
 * surfaced via the returned `error` state for the caller to handle (e.g.
 * Boot.jsx may decide to fall back to localStorage-only mode).
 *
 * Returns: { user, session, loading, error }
 */

import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: { session: existing }, error: getErr } =
          await supabase.auth.getSession();

        if (getErr) throw getErr;

        if (existing) {
          if (cancelled) return;
          setSession(existing);
          setUser(existing.user);
          setLoading(false);
          return;
        }

        const { data, error: signInErr } =
          await supabase.auth.signInWithPassword({
            email: import.meta.env.VITE_JARVIS_EMAIL,
            password: import.meta.env.VITE_JARVIS_PASSWORD,
          });

        if (cancelled) return;

        if (signInErr) {
          setError(signInErr);
          setLoading(false);
          return;
        }

        setSession(data.session);
        setUser(data.user);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err);
        setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading, error };
}
