// smokeTest.js — manual RLS + reachability smoke test
/**
 * Manual smoke test for the Supabase wiring.
 *
 * NOT auto-run by CI, NOT imported by app code. This is a DevTools tool —
 * after a boot has authenticated the user, you call it from the browser
 * console to confirm that:
 *
 *   1. The signed-in session can read its own jarvis_users row.
 *   2. RLS is actually filtering — reading "all" jarvis_users returns
 *      exactly 1 row (only the caller's). If it ever returns >1, RLS is
 *      broken or disabled.
 *   3. jarvis_events is reachable and we can count rows.
 *
 * INVOCATION (DevTools console, after the app has booted):
 *
 *     const { smokeTestRLS } = await import('/src/utils/__test__/smokeTest.js');
 *     const result = await smokeTestRLS();
 *     console.log(result);
 *
 * Expected output for a healthy single-user setup post-Block-3:
 *     { rlsActive: true, eventsTableReachable: true, eventCount: <number> }
 *
 * Each step logs PASS/FAIL with the [smokeTest] prefix so you can scan
 * the console output without expanding the returned object.
 */

import { supabase } from '../../lib/supabaseClient';

const EXPECTED_DISPLAY_NAME = 'Nikhil Panwar';

export async function smokeTestRLS() {
  let rlsActive = false;
  let eventsTableReachable = false;
  let eventCount = 0;

  // -------------------------------------------------------------------------
  // Step 1: Read the caller's own jarvis_users row.
  // -------------------------------------------------------------------------
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log(
      '[smokeTest] step 1 — read own jarvis_users row: FAIL (no authed user)'
    );
    return { rlsActive, eventsTableReachable, eventCount };
  }

  const { data: ownRow, error: ownErr } = await supabase
    .from('jarvis_users')
    .select('id, display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (ownErr || !ownRow) {
    console.log(
      `[smokeTest] step 1 — read own jarvis_users row: FAIL (${
        ownErr?.message ?? 'no row'
      })`
    );
  } else if (ownRow.display_name !== EXPECTED_DISPLAY_NAME) {
    console.log(
      `[smokeTest] step 1 — read own jarvis_users row: FAIL (display_name="${ownRow.display_name}", expected "${EXPECTED_DISPLAY_NAME}")`
    );
  } else {
    console.log(
      `[smokeTest] step 1 — read own jarvis_users row: PASS (display_name="${ownRow.display_name}")`
    );
  }

  // -------------------------------------------------------------------------
  // Step 2: Read all jarvis_users — RLS should restrict this to 1 row.
  // -------------------------------------------------------------------------
  const { data: allRows, error: allErr } = await supabase
    .from('jarvis_users')
    .select('id');

  if (allErr) {
    console.log(
      `[smokeTest] step 2 — RLS validation: FAIL (${allErr.message})`
    );
  } else if (allRows.length === 1) {
    rlsActive = true;
    console.log('[smokeTest] step 2 — RLS validation: PASS (1 row only)');
  } else {
    console.log(
      `[smokeTest] step 2 — RLS validation: FAIL (returned ${allRows.length} rows; expected exactly 1)`
    );
  }

  // -------------------------------------------------------------------------
  // Step 3: jarvis_events reachable + count.
  // -------------------------------------------------------------------------
  const { count, error: evErr } = await supabase
    .from('jarvis_events')
    .select('id', { count: 'exact', head: true });

  if (evErr) {
    console.log(
      `[smokeTest] step 3 — jarvis_events reachable: FAIL (${evErr.message})`
    );
  } else {
    eventsTableReachable = true;
    eventCount = count ?? 0;
    console.log(
      `[smokeTest] step 3 — jarvis_events reachable: PASS (rowCount=${eventCount})`
    );
  }

  return { rlsActive, eventsTableReachable, eventCount };
}
