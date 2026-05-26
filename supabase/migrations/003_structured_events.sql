-- =================================================================
-- JARVIS OS  Migration 003: structured_events
-- Bible v4 Layer 2 Pro Janitor output table
-- =================================================================
-- Purpose:
--   Cleaned, structured output from L2 Gemini Pro Janitor.
--   Janitor reads raw turns from jarvis_events (event_type IN
--   ('VOICE_TURN','CHAT_TURN')) and produces structured JSON
--   anchored to source text via Receipt Pattern.
--
-- Receipt Pattern (Gemini-validated):
--   Every marker is a JSONB object:
--     { "turn_id": "<uuid>",
--       "exact_quote": "<verbatim from source>",
--       "extracted_<dim>": "<single normalized value>" }
--   NEVER flat string arrays  those invite normalization drift.
--   Shape enforced at Edge Function prompt level, not DB CHECK.
--
-- Idempotency:
--   source_event_id UNIQUE prevents double-process.
--   Edge Function uses ON CONFLICT (source_event_id) DO NOTHING.
--   UNIQUE constraint auto-creates its own btree index  no separate index needed.
--
-- RLS:
--   Single user-scoped FOR ALL policy.
--   Service role (Edge Function in Phase 2) bypasses RLS by default.
--
-- Webhook trigger:
--   NOT in this migration. Created in separate migration 004
--   during Phase 3 after Edge Function URL exists.
-- =================================================================

CREATE TABLE IF NOT EXISTS public.structured_events (
  -- Identity
  id              UUID PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_event_id UUID NOT NULL UNIQUE
                    REFERENCES public.jarvis_events(id) ON DELETE CASCADE,

  -- Receipt Pattern marker arrays
  entities_mentioned  JSONB NOT NULL DEFAULT '[]'::jsonb,
  emotional_markers   JSONB NOT NULL DEFAULT '[]'::jsonb,
  technical_blockers  JSONB NOT NULL DEFAULT '[]'::jsonb,
  commitments_made    JSONB NOT NULL DEFAULT '[]'::jsonb,
  people_mentioned    JSONB NOT NULL DEFAULT '[]'::jsonb,
  project_tags        JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Janitor metadata
  model_version        TEXT  NOT NULL,
  janitor_config       JSONB NOT NULL,
  finish_reason        TEXT,
  raw_response_excerpt TEXT,

  -- Timestamps
  occurred_at   TIMESTAMPTZ NOT NULL,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_structured_events_user_occurred
  ON public.structured_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_structured_events_entities_gin
  ON public.structured_events USING GIN (entities_mentioned);

ALTER TABLE public.structured_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS structured_events_owner_all ON public.structured_events;

CREATE POLICY structured_events_owner_all
  ON public.structured_events
  FOR ALL
  TO authenticated
  USING       (auth.uid() = user_id)
  WITH CHECK  (auth.uid() = user_id);

COMMENT ON TABLE public.structured_events IS
  'Bible v4 L2 Janitor output. One row = one cleaned VOICE_TURN or CHAT_TURN. Receipt Pattern: every marker JSONB object with turn_id + exact_quote + extracted_X.';

COMMENT ON COLUMN public.structured_events.source_event_id IS
  'FK to jarvis_events.id. UNIQUE = idempotency guard. Janitor uses ON CONFLICT (source_event_id) DO NOTHING.';

COMMENT ON COLUMN public.structured_events.janitor_config IS
  'Snapshot of Pro config at processing time. Expected: {"thinkingLevel":"low","maxOutputTokens":8192,"responseMimeType":"application/json"}.';

COMMENT ON COLUMN public.structured_events.finish_reason IS
  'Captured from Gemini API response.candidates[0].finishReason. MUST be STOP for valid row.';

COMMENT ON COLUMN public.structured_events.raw_response_excerpt IS
  'First ~500 chars of raw Pro response for debugging when finish_reason != STOP.';
