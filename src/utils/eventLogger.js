// eventLogger.js — single entry point for all JARVIS event writes
/**
 * eventLogger
 *
 * Bible v4 Critical Rule 6: every JARVIS write to `jarvis_events` goes through
 * this module. One choke point means one place to add: prompt-cache logging,
 * batching, offline queueing, retry, telemetry. Callers never reach into
 * `supabase.rpc('log_jarvis_event', ...)` directly.
 *
 * Contract:
 *   - Fire-and-forget. Never throws. On failure, returns { success: false, error }.
 *   - Idempotent: server-side `ON CONFLICT (id) DO NOTHING` on the RPC means a
 *     retry with the same eventId is safe.
 *   - Async but unawaited callers are fine — there is no observable side effect
 *     in the UI from a write failing. Callers that DO want to know whether the
 *     write landed can `await` and inspect `success`.
 *
 * Mapping decisions (Block 5, option A):
 *   - The schema's `source_device` column means hardware ('laptop', 'phone',
 *     etc.), not AI layer. JARVIS's logical concept of "which AI layer
 *     produced this event" doesn't have a column, so `sourceLayer` is folded
 *     into the JSONB payload (queryable via the existing GIN index on
 *     `payload`). The only sourceLayer that maps to a real device is
 *     APP_CLIENT — written from the browser, so source_device = 'laptop'.
 *     Other layers (Gemini Live, Opus, etc.) run server-side; source_device
 *     stays NULL.
 *   - `domain` is required by the RPC and must be supplied by the caller.
 *     Schema-suggested values: 'system', 'body', 'mind', 'work', 'voice',
 *     'oura', etc. We don't validate against an enum because the schema
 *     itself doesn't.
 *   - `occurred_at` is auto-filled from the client clock at logEvent() call
 *     time. If a caller needs a different timestamp (e.g., backfill from a
 *     queued event), pass it via `payload.occurredAtOverride` and we'll add a
 *     param later — for now, every logEvent() is "now".
 */

import { supabase } from '../lib/supabaseClient';
import { newEventId } from './ulidGen';

/**
 * Logical layer that produced an event. Folded into payload.sourceLayer
 * because the schema has no source_layer column.
 */
export const SOURCE_LAYERS = Object.freeze({
  L1_GEMINI_LIVE: 'L1_GEMINI_LIVE',
  L2_PRO_ENGINEER: 'L2_PRO_ENGINEER',
  L3_PRO_TRAINING: 'L3_PRO_TRAINING',
  L4_OPUS: 'L4_OPUS',
  L5_CLOUD_TTS: 'L5_CLOUD_TTS',
  APP_CLIENT: 'APP_CLIENT',
});

const VALID_LAYERS = new Set(Object.values(SOURCE_LAYERS));

/**
 * Write one event to jarvis_events via the log_jarvis_event RPC.
 *
 * @param {object}  args
 * @param {string}  args.eventType    e.g. 'BOOT_INITIATED' (required, non-empty)
 * @param {string}  args.domain       e.g. 'system', 'body', 'mind' (required, non-empty)
 * @param {string}  args.sourceLayer  one of SOURCE_LAYERS values (required)
 * @param {object} [args.payload={}]  arbitrary JSONB payload (must be a plain object)
 *
 * @returns {Promise<{ success: true,  eventId: string, data: any }
 *                  | { success: false, error: string }>}
 */
export async function logEvent({ eventType, domain, sourceLayer, payload = {} }) {
  if (typeof eventType !== 'string' || eventType.length === 0) {
    return { success: false, error: 'eventType must be a non-empty string' };
  }
  if (typeof domain !== 'string' || domain.length === 0) {
    return { success: false, error: 'domain must be a non-empty string' };
  }
  if (!VALID_LAYERS.has(sourceLayer)) {
    return {
      success: false,
      error: `sourceLayer must be one of: ${[...VALID_LAYERS].join(', ')}`,
    };
  }
  if (
    payload === null ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    return { success: false, error: 'payload must be a plain object' };
  }

  const eventId = newEventId();
  const enrichedPayload = { ...payload, sourceLayer };
  const sourceDevice =
    sourceLayer === SOURCE_LAYERS.APP_CLIENT ? 'laptop' : null;

  try {
    const { data, error } = await supabase.rpc('log_jarvis_event', {
      p_event_id: eventId,
      p_domain: domain,
      p_event_type: eventType,
      p_payload: enrichedPayload,
      p_occurred_at: new Date().toISOString(),
      p_source_device: sourceDevice,
    });

    if (error) {
      console.error('[eventLogger] RPC error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, eventId, data };
  } catch (err) {
    console.error('[eventLogger] thrown:', err?.message ?? String(err));
    return { success: false, error: err?.message ?? String(err) };
  }
}
