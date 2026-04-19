-- =============================================================================
-- JARVIS OS — GOD-TIER MIGRATION v1.0
-- Session 79 — Apr 17, 2026
-- 38 tables across 12 life sectors
-- Pattern C (CQRS) | ULID-as-UUID | RLS | Postgres RPC | Webhooks
-- Validated by Gemini 3.1 Pro across 4 consultation rounds
-- 
-- Author: Nikhil Panwar
-- Target: Supabase (Free → Pro at 400MB trigger)
-- Rollback: DROP SCHEMA jarvis CASCADE; (nuclear option)
--
-- ॐ Radha Rani ki kripa se 🙏🏽
-- =============================================================================

BEGIN;

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";       -- pgvector (HNSW disabled till Pro)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- trigram search for text
CREATE EXTENSION IF NOT EXISTS "btree_gin";    -- composite GIN indexes

-- =============================================================================
-- SCHEMA NAMESPACE
-- =============================================================================
-- All JARVIS tables live in `public` for Supabase PostgREST auto-expose.
-- Helper functions in `jarvis_private` to keep API surface clean.

CREATE SCHEMA IF NOT EXISTS jarvis_private;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Current user_id from JWT (RLS helper)
CREATE OR REPLACE FUNCTION jarvis_private.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.uid();
$$;

-- Update `updated_at` on row change
CREATE OR REPLACE FUNCTION jarvis_private.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- LWW (Last-Write-Wins) guard: reject older occurred_at updates
CREATE OR REPLACE FUNCTION jarvis_private.lww_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.occurred_at < OLD.occurred_at THEN
    -- Silently skip (log event elsewhere already captured history)
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- CORE 4: FOUNDATION
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table 1: jarvis_users (the singular — me)
-- -----------------------------------------------------------------------------
CREATE TABLE public.jarvis_users (
  id                uuid PRIMARY KEY DEFAULT auth.uid(),
  email             text UNIQUE NOT NULL,
  display_name      text NOT NULL DEFAULT 'Nikhil Panwar',
  date_of_birth     date,
  timezone          text NOT NULL DEFAULT 'Asia/Kolkata',
  
  -- Core identity (slowly changing)
  core_values       jsonb NOT NULL DEFAULT '{}'::jsonb,
  north_star        jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_phase     text NOT NULL DEFAULT 'finops_build',
  
  -- Preferences (voice, show mode, notifications)
  preferences       jsonb NOT NULL DEFAULT '{"voice_enabled": true, "show_mode": false}'::jsonb,
  
  -- Integration tokens (to be stored in Supabase Vault later)
  integrations      jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW(),
  deleted_at        timestamptz
);

CREATE INDEX idx_users_email ON public.jarvis_users (email);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.jarvis_users
  FOR EACH ROW EXECUTE FUNCTION jarvis_private.touch_updated_at();

ALTER TABLE public.jarvis_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see only themselves" ON public.jarvis_users
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

COMMENT ON TABLE public.jarvis_users IS 
  'Singular user table. One row. Core identity + preferences + integrations.';

-- -----------------------------------------------------------------------------
-- Table 2: jarvis_entities (universal knowledge graph)
-- -----------------------------------------------------------------------------
-- Everything is an entity: me, Nidhi, Akshay, Zomato, React, ADHD, London
CREATE TABLE public.jarvis_entities (
  id                uuid PRIMARY KEY,  -- ULID-as-UUID from client
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  entity_type       text NOT NULL CHECK (entity_type IN (
    'self', 'person', 'company', 'concept', 'skill', 'place', 
    'tool', 'project', 'event', 'media', 'goal'
  )),
  
  name              text NOT NULL,
  slug              text NOT NULL,  -- lowercase, kebab-case for lookups
  
  -- Flexible metadata
  attributes        jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Relationship tracking (for people)
  relationship_dims jsonb DEFAULT NULL,  -- {trust, honesty, commitment, depth, intimacy, challenge}
  
  -- Importance
  importance_score  smallint NOT NULL DEFAULT 5 CHECK (importance_score BETWEEN 1 AND 10),
  
  -- Timestamps
  first_seen_at     timestamptz NOT NULL DEFAULT NOW(),
  last_interacted   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW(),
  deleted_at        timestamptz,
  
  UNIQUE (user_id, slug)
);

CREATE INDEX idx_entities_user_type ON public.jarvis_entities (user_id, entity_type);
CREATE INDEX idx_entities_slug_trgm ON public.jarvis_entities USING gin (slug gin_trgm_ops);
CREATE INDEX idx_entities_attributes ON public.jarvis_entities USING gin (attributes jsonb_path_ops);
CREATE INDEX idx_entities_last_interacted ON public.jarvis_entities (last_interacted DESC NULLS LAST);

CREATE TRIGGER trg_entities_updated_at BEFORE UPDATE ON public.jarvis_entities
  FOR EACH ROW EXECUTE FUNCTION jarvis_private.touch_updated_at();

ALTER TABLE public.jarvis_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Entities: owner only" ON public.jarvis_entities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.jarvis_entities IS 
  'Universal knowledge graph. Every noun in Nikhils life is an entity. 
   Other tables FK here for relational power.';

-- -----------------------------------------------------------------------------
-- Table 3: jarvis_events (THE firehose — immutable append-only)
-- -----------------------------------------------------------------------------
CREATE TABLE public.jarvis_events (
  id                uuid PRIMARY KEY,  -- ULID-as-UUID, client-generated
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  -- Categorization
  domain            text NOT NULL,  -- 'body', 'mind', 'work', 'voice', 'oura', ...
  event_type        text NOT NULL,  -- 'check_in_submitted', 'mood_logged', ...
  
  -- Actor & context
  source_device     text,  -- 'laptop', 'phone', 'pi', 'xr_glasses'
  actor_entity_id   uuid REFERENCES public.jarvis_entities(id),  -- who triggered this
  related_entities  uuid[] DEFAULT '{}',  -- entities mentioned
  
  -- Payload (flexible, evolves with schema changes)
  payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  occurred_at       timestamptz NOT NULL,  -- when event actually happened (client)
  synced_at         timestamptz NOT NULL DEFAULT NOW()  -- when it hit DB
  -- NOTE: no updated_at, no deleted_at — events are IMMUTABLE
);

-- BRIN index on occurred_at — 99% smaller than btree, fast chronological queries
CREATE INDEX idx_events_occurred_brin ON public.jarvis_events USING brin (occurred_at);
CREATE INDEX idx_events_user_domain ON public.jarvis_events (user_id, domain, occurred_at DESC);
CREATE INDEX idx_events_type ON public.jarvis_events (event_type);
CREATE INDEX idx_events_payload ON public.jarvis_events USING gin (payload jsonb_path_ops);
CREATE INDEX idx_events_actor ON public.jarvis_events (actor_entity_id) WHERE actor_entity_id IS NOT NULL;

ALTER TABLE public.jarvis_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events: owner only" ON public.jarvis_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.jarvis_events IS 
  'Immutable firehose. Every action, thought, signal lands here first. 
   Chronological source of truth. Never DELETE, never UPDATE.';

-- -----------------------------------------------------------------------------
-- Table 4: jarvis_api_logs (every Claude/Gemini call)
-- -----------------------------------------------------------------------------
CREATE TABLE public.jarvis_api_logs (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  provider          text NOT NULL CHECK (provider IN ('anthropic', 'google', 'openai', 'oura')),
  model             text NOT NULL,  -- 'claude-sonnet-4-6', 'gemini-3.1-flash-live'...
  purpose           text NOT NULL,  -- 'chat', 'briefing', 'insight', 'analysis'
  
  tokens_in         integer,
  tokens_out        integer,
  cost_usd          numeric(10, 6),
  latency_ms        integer,
  
  success           boolean NOT NULL DEFAULT true,
  error_message     text,
  
  -- Link back to triggering event
  triggered_by      uuid REFERENCES public.jarvis_events(id),
  
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_logs_created_brin ON public.jarvis_api_logs USING brin (created_at);
CREATE INDEX idx_api_logs_provider_model ON public.jarvis_api_logs (provider, model);
CREATE INDEX idx_api_logs_purpose ON public.jarvis_api_logs (purpose);
CREATE INDEX idx_api_logs_errors ON public.jarvis_api_logs (created_at DESC) WHERE success = false;

ALTER TABLE public.jarvis_api_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Api logs: owner only" ON public.jarvis_api_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Table 5: jarvis_device_state (which device is active, UI state)
-- -----------------------------------------------------------------------------
CREATE TABLE public.jarvis_device_state (
  device_id         text PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  device_type       text NOT NULL,  -- 'laptop', 'phone', 'pi', 'xr'
  device_name       text,
  user_agent        text,
  
  -- Current state
  active_tab        text,
  active_mode       text,
  voice_connected   boolean NOT NULL DEFAULT false,
  
  -- Health
  last_seen         timestamptz NOT NULL DEFAULT NOW(),
  is_online         boolean NOT NULL DEFAULT true,
  
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_device_user ON public.jarvis_device_state (user_id, last_seen DESC);

CREATE TRIGGER trg_device_updated_at BEFORE UPDATE ON public.jarvis_device_state
  FOR EACH ROW EXECUTE FUNCTION jarvis_private.touch_updated_at();

ALTER TABLE public.jarvis_device_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Devices: owner only" ON public.jarvis_device_state
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SECTOR 1 — BODY (3 tables)
-- =============================================================================

-- Table 6: jarvis_biometrics (Oura hourly time-series)
CREATE TABLE public.jarvis_biometrics (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  source            text NOT NULL DEFAULT 'oura',  -- 'oura', 'phone', 'pi_camera'
  metric_type       text NOT NULL,  -- 'heart_rate', 'hrv', 'sleep_score', 'spo2', 'temperature'
  
  value_numeric     numeric,
  value_jsonb       jsonb,  -- for complex metrics (sleep stages breakdown)
  unit              text,   -- 'bpm', 'ms', 'celsius', 'percent'
  
  measured_at       timestamptz NOT NULL,
  synced_at         timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_biometrics_measured_brin ON public.jarvis_biometrics USING brin (measured_at);
CREATE INDEX idx_biometrics_user_type ON public.jarvis_biometrics (user_id, metric_type, measured_at DESC);

ALTER TABLE public.jarvis_biometrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Biometrics: owner only" ON public.jarvis_biometrics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 7: jarvis_nutrition
CREATE TABLE public.jarvis_nutrition (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  meal_type         text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'drink')),
  food_items        jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{name, qty, calories?}]
  location          text,
  felt_after        jsonb,  -- {energy, mood, digestion} 1-5 scales
  
  consumed_at       timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nutrition_consumed_brin ON public.jarvis_nutrition USING brin (consumed_at);
CREATE INDEX idx_nutrition_user ON public.jarvis_nutrition (user_id, consumed_at DESC);

ALTER TABLE public.jarvis_nutrition ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Nutrition: owner only" ON public.jarvis_nutrition
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 8: jarvis_physical_state (state table — LWW guarded)
CREATE TABLE public.jarvis_physical_state (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  energy_level      smallint CHECK (energy_level BETWEEN 1 AND 5),
  fatigue_level     smallint CHECK (fatigue_level BETWEEN 1 AND 5),
  pain_level        smallint CHECK (pain_level BETWEEN 0 AND 10),
  hydration_level   smallint CHECK (hydration_level BETWEEN 1 AND 5),
  exercise_today    boolean DEFAULT false,
  
  notes             text,
  
  occurred_at       timestamptz NOT NULL,  -- LWW key
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_physical_user_occurred ON public.jarvis_physical_state (user_id, occurred_at DESC);

CREATE TRIGGER trg_physical_lww BEFORE UPDATE ON public.jarvis_physical_state
  FOR EACH ROW EXECUTE FUNCTION jarvis_private.lww_guard();
CREATE TRIGGER trg_physical_updated_at BEFORE UPDATE ON public.jarvis_physical_state
  FOR EACH ROW EXECUTE FUNCTION jarvis_private.touch_updated_at();

ALTER TABLE public.jarvis_physical_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Physical state: owner only" ON public.jarvis_physical_state
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SECTOR 2 — MIND (4 tables)
-- =============================================================================

-- Table 9: jarvis_check_ins (daily 14-field debrief)
CREATE TABLE public.jarvis_check_ins (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  checkin_date      date NOT NULL,
  
  -- 14 fields from LogTab
  energy            smallint CHECK (energy BETWEEN 1 AND 5),
  mood              smallint CHECK (mood BETWEEN 1 AND 5),
  focus             smallint CHECK (focus BETWEEN 1 AND 5),
  confidence        smallint CHECK (confidence BETWEEN 1 AND 10),
  
  wins_today        jsonb DEFAULT '[]'::jsonb,
  blockers          jsonb DEFAULT '[]'::jsonb,
  grateful_for      text,
  learned_today     text,
  
  sleep_hours       numeric(3,1),
  exercise_minutes  integer,
  screen_time_mins  integer,
  
  journal           text,
  raw_check_in      jsonb NOT NULL DEFAULT '{}'::jsonb,  -- full payload
  
  occurred_at       timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW(),
  deleted_at        timestamptz,
  
  UNIQUE (user_id, checkin_date)
);

CREATE INDEX idx_checkins_user_date ON public.jarvis_check_ins (user_id, checkin_date DESC);
CREATE INDEX idx_checkins_journal_trgm ON public.jarvis_check_ins USING gin (journal gin_trgm_ops);

CREATE TRIGGER trg_checkins_updated_at BEFORE UPDATE ON public.jarvis_check_ins
  FOR EACH ROW EXECUTE FUNCTION jarvis_private.touch_updated_at();

ALTER TABLE public.jarvis_check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Checkins: owner only" ON public.jarvis_check_ins
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 10: jarvis_mood_episodes (multi-hour mood windows)
CREATE TABLE public.jarvis_mood_episodes (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  mood_tag          text NOT NULL,  -- 'anxious', 'flow', 'frustrated', 'content'
  intensity         smallint CHECK (intensity BETWEEN 1 AND 10),
  valence           smallint CHECK (valence BETWEEN -5 AND 5),
  
  triggered_by      text,
  ended_by          text,
  context_entities  uuid[] DEFAULT '{}',
  
  started_at        timestamptz NOT NULL,
  ended_at          timestamptz,
  duration_minutes  integer GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (ended_at - started_at))::integer / 60
    ELSE NULL END
  ) STORED,
  
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mood_user_started ON public.jarvis_mood_episodes (user_id, started_at DESC);
CREATE INDEX idx_mood_tag ON public.jarvis_mood_episodes (mood_tag);
CREATE INDEX idx_mood_active ON public.jarvis_mood_episodes (user_id) WHERE ended_at IS NULL;

ALTER TABLE public.jarvis_mood_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mood: owner only" ON public.jarvis_mood_episodes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 11: jarvis_focus_sessions
CREATE TABLE public.jarvis_focus_sessions (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  session_type      text CHECK (session_type IN ('pomodoro', 'deep_work', 'hyperfocus', 'flow')),
  planned_minutes   integer,
  actual_minutes    integer,
  
  project_entity_id uuid REFERENCES public.jarvis_entities(id),
  task_description  text,
  
  interruptions     integer DEFAULT 0,
  distractions     jsonb DEFAULT '[]'::jsonb,
  
  perceived_focus   smallint CHECK (perceived_focus BETWEEN 1 AND 10),
  outcome_quality   smallint CHECK (outcome_quality BETWEEN 1 AND 10),
  
  started_at        timestamptz NOT NULL,
  ended_at          timestamptz,
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_focus_user_started ON public.jarvis_focus_sessions (user_id, started_at DESC);
CREATE INDEX idx_focus_project ON public.jarvis_focus_sessions (project_entity_id);

ALTER TABLE public.jarvis_focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Focus: owner only" ON public.jarvis_focus_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 12: jarvis_adhd_patterns
CREATE TABLE public.jarvis_adhd_patterns (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  pattern_type      text NOT NULL CHECK (pattern_type IN (
    'start_assist_triggered', 'decision_fatigue', 'dopamine_cycle',
    'avoidance_detected', 'hyperfocus_entered', 'hyperfocus_broken',
    'context_saved', 'context_restored', 'task_switched'
  )),
  
  severity          smallint CHECK (severity BETWEEN 1 AND 5),
  context           jsonb NOT NULL DEFAULT '{}'::jsonb,
  intervention_id   uuid,  -- FK to interventions, defined later
  outcome           text CHECK (outcome IN ('helped', 'no_effect', 'worsened', 'pending')),
  
  occurred_at       timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_adhd_user_occurred ON public.jarvis_adhd_patterns (user_id, occurred_at DESC);
CREATE INDEX idx_adhd_type ON public.jarvis_adhd_patterns (pattern_type);

ALTER TABLE public.jarvis_adhd_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ADHD: owner only" ON public.jarvis_adhd_patterns
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SECTOR 3 — WORK (3 tables)
-- =============================================================================

-- Table 13: jarvis_build_log
CREATE TABLE public.jarvis_build_log (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  project_entity_id uuid REFERENCES public.jarvis_entities(id),
  session_number    integer,  -- sequential per project
  
  what_built        text NOT NULL,
  bugs_hit          jsonb DEFAULT '[]'::jsonb,
  decisions_made    jsonb DEFAULT '[]'::jsonb,
  
  git_commits       text[] DEFAULT '{}',
  files_touched     text[] DEFAULT '{}',
  lines_added       integer,
  lines_removed     integer,
  
  duration_minutes  integer,
  energy_at_start   smallint,
  energy_at_end     smallint,
  
  started_at        timestamptz NOT NULL,
  ended_at          timestamptz,
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_build_user_started ON public.jarvis_build_log (user_id, started_at DESC);
CREATE INDEX idx_build_project ON public.jarvis_build_log (project_entity_id, session_number DESC);

ALTER TABLE public.jarvis_build_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Build: owner only" ON public.jarvis_build_log
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 14: jarvis_code_metrics
CREATE TABLE public.jarvis_code_metrics (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  project_entity_id uuid REFERENCES public.jarvis_entities(id),
  metric_date       date NOT NULL,
  
  lines_written     integer DEFAULT 0,
  prs_opened        integer DEFAULT 0,
  prs_merged        integer DEFAULT 0,
  commits           integer DEFAULT 0,
  test_coverage     numeric(5, 2),
  debug_minutes     integer,
  
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, project_entity_id, metric_date)
);

CREATE INDEX idx_code_user_date ON public.jarvis_code_metrics (user_id, metric_date DESC);

ALTER TABLE public.jarvis_code_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Code metrics: owner only" ON public.jarvis_code_metrics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 15: jarvis_work_commitments
CREATE TABLE public.jarvis_work_commitments (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  commitment_type   text CHECK (commitment_type IN ('self', 'team', 'client', 'deadline')),
  description       text NOT NULL,
  to_entity_id      uuid REFERENCES public.jarvis_entities(id),  -- who I promised
  
  deadline          timestamptz,
  status            text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'in_progress', 'completed', 'slipped', 'cancelled'
  )),
  
  slipped_count     integer DEFAULT 0,
  notes             text,
  
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW(),
  completed_at      timestamptz
);

CREATE INDEX idx_commitments_user_status ON public.jarvis_work_commitments (user_id, status, deadline);

CREATE TRIGGER trg_commitments_updated_at BEFORE UPDATE ON public.jarvis_work_commitments
  FOR EACH ROW EXECUTE FUNCTION jarvis_private.touch_updated_at();

ALTER TABLE public.jarvis_work_commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Commitments: owner only" ON public.jarvis_work_commitments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SECTOR 4 — MONEY (2 tables)
-- =============================================================================

-- Table 16: jarvis_transactions
CREATE TABLE public.jarvis_transactions (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  direction         text NOT NULL CHECK (direction IN ('in', 'out')),
  amount_inr        numeric(12, 2) NOT NULL,
  amount_usd        numeric(12, 2),
  
  category          text,  -- 'food', 'rent', 'tools', 'hardware', 'lumora_income'
  description       text,
  counterparty_entity_id uuid REFERENCES public.jarvis_entities(id),
  
  payment_method    text,
  
  occurred_at       timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tx_user_occurred ON public.jarvis_transactions (user_id, occurred_at DESC);
CREATE INDEX idx_tx_category ON public.jarvis_transactions (category);

ALTER TABLE public.jarvis_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transactions: owner only" ON public.jarvis_transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 17: jarvis_financial_goals
CREATE TABLE public.jarvis_financial_goals (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  goal_name         text NOT NULL,
  target_amount_inr numeric(12, 2) NOT NULL,
  current_amount_inr numeric(12, 2) DEFAULT 0,
  target_date       date,
  
  category          text,  -- 'career', 'relocation', 'hardware', 'emergency'
  status            text DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'paused', 'abandoned')),
  
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW(),
  achieved_at       timestamptz
);

CREATE TRIGGER trg_goals_updated_at BEFORE UPDATE ON public.jarvis_financial_goals
  FOR EACH ROW EXECUTE FUNCTION jarvis_private.touch_updated_at();

ALTER TABLE public.jarvis_financial_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Goals: owner only" ON public.jarvis_financial_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SECTOR 5 — RELATIONS (2 tables — entities already has people)
-- =============================================================================

-- Table 18: jarvis_relationships (time-series of 6-dim scores per entity)
CREATE TABLE public.jarvis_relationships (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  entity_id         uuid NOT NULL REFERENCES public.jarvis_entities(id),
  
  -- 6 dimensions (0-100 each)
  trust             smallint CHECK (trust BETWEEN 0 AND 100),
  honesty           smallint CHECK (honesty BETWEEN 0 AND 100),
  commitment        smallint CHECK (commitment BETWEEN 0 AND 100),
  depth             smallint CHECK (depth BETWEEN 0 AND 100),
  intimacy          smallint CHECK (intimacy BETWEEN 0 AND 100),
  challenge         smallint CHECK (challenge BETWEEN 0 AND 100),
  
  -- Delta from last snapshot
  delta_reason      text,
  
  measured_at       timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rel_user_entity ON public.jarvis_relationships (user_id, entity_id, measured_at DESC);

ALTER TABLE public.jarvis_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relationships: owner only" ON public.jarvis_relationships
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 19: jarvis_interactions (every conversation/call/message)
CREATE TABLE public.jarvis_interactions (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  with_entity_id    uuid NOT NULL REFERENCES public.jarvis_entities(id),
  
  channel           text CHECK (channel IN ('in_person', 'call', 'video', 'message', 'email', 'social')),
  direction         text CHECK (direction IN ('initiated', 'received', 'mutual')),
  
  topics            text[],
  sentiment         smallint CHECK (sentiment BETWEEN -5 AND 5),
  summary           text,
  
  duration_minutes  integer,
  
  occurred_at       timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interactions_user_entity ON public.jarvis_interactions (user_id, with_entity_id, occurred_at DESC);
CREATE INDEX idx_interactions_occurred_brin ON public.jarvis_interactions USING brin (occurred_at);

ALTER TABLE public.jarvis_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Interactions: owner only" ON public.jarvis_interactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SECTOR 6 — LEARNING (3 tables)
-- =============================================================================

-- Table 20: jarvis_concepts
CREATE TABLE public.jarvis_concepts (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  concept_name      text NOT NULL,
  domain            text,  -- 'llm', 'react', 'postgres', 'system_design'
  
  strength          smallint NOT NULL DEFAULT 0 CHECK (strength BETWEEN 0 AND 100),
  prerequisites     uuid[] DEFAULT '{}',  -- other concept IDs
  
  -- Spaced repetition
  last_reviewed     timestamptz,
  next_review       timestamptz,
  review_count      integer DEFAULT 0,
  
  notes             text,
  resources         jsonb DEFAULT '[]'::jsonb,
  
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW(),
  
  UNIQUE (user_id, concept_name)
);

CREATE INDEX idx_concepts_user_strength ON public.jarvis_concepts (user_id, strength);
CREATE INDEX idx_concepts_review ON public.jarvis_concepts (next_review) WHERE next_review IS NOT NULL;

CREATE TRIGGER trg_concepts_updated_at BEFORE UPDATE ON public.jarvis_concepts
  FOR EACH ROW EXECUTE FUNCTION jarvis_private.touch_updated_at();

ALTER TABLE public.jarvis_concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Concepts: owner only" ON public.jarvis_concepts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 21: jarvis_knowledge_nodes
CREATE TABLE public.jarvis_knowledge_nodes (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  node_type         text CHECK (node_type IN ('fact', 'insight', 'quote', 'question', 'answer', 'example')),
  content           text NOT NULL,
  
  source_type       text,  -- 'book', 'course', 'conversation', 'experiment'
  source_reference  text,
  
  linked_concepts   uuid[] DEFAULT '{}',
  linked_entities   uuid[] DEFAULT '{}',
  
  confidence        smallint CHECK (confidence BETWEEN 1 AND 10),
  
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW(),
  deleted_at        timestamptz
);

CREATE INDEX idx_knowledge_user_type ON public.jarvis_knowledge_nodes (user_id, node_type);
CREATE INDEX idx_knowledge_content_trgm ON public.jarvis_knowledge_nodes USING gin (content gin_trgm_ops);

CREATE TRIGGER trg_knowledge_updated_at BEFORE UPDATE ON public.jarvis_knowledge_nodes
  FOR EACH ROW EXECUTE FUNCTION jarvis_private.touch_updated_at();

ALTER TABLE public.jarvis_knowledge_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Knowledge: owner only" ON public.jarvis_knowledge_nodes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 22: jarvis_conversations
CREATE TABLE public.jarvis_conversations (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  mode              text NOT NULL,  -- 'chat', 'quiz', 'presser', ... (18 modes)
  brain             text NOT NULL CHECK (brain IN ('sonnet', 'opus', 'extended', 'gemini')),
  
  messages          jsonb NOT NULL DEFAULT '[]'::jsonb,  -- full message array
  summary           text,  -- AI-generated summary
  key_insights      text[],  -- extracted insights
  
  message_count     integer NOT NULL DEFAULT 0,
  total_tokens      integer,
  total_cost_usd    numeric(10, 6),
  
  started_at        timestamptz NOT NULL,
  ended_at          timestamptz,
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conv_user_started ON public.jarvis_conversations (user_id, started_at DESC);
CREATE INDEX idx_conv_mode ON public.jarvis_conversations (mode);
CREATE INDEX idx_conv_summary_trgm ON public.jarvis_conversations USING gin (summary gin_trgm_ops);

CREATE TRIGGER trg_conv_updated_at BEFORE UPDATE ON public.jarvis_conversations
  FOR EACH ROW EXECUTE FUNCTION jarvis_private.touch_updated_at();

ALTER TABLE public.jarvis_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conversations: owner only" ON public.jarvis_conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SECTOR 7 — CAREER (3 tables)
-- =============================================================================

-- Table 23: jarvis_applications
CREATE TABLE public.jarvis_applications (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  company_entity_id uuid NOT NULL REFERENCES public.jarvis_entities(id),
  role_title        text NOT NULL,
  role_type         text,  -- 'ai_product_engineer', 'genai_engineer', 'llm_engineer', 'fullstack'
  location          text,
  salary_range      text,
  
  referrer_entity_id uuid REFERENCES public.jarvis_entities(id),  -- who referred (e.g., Nidhi)
  job_url           text,
  
  stage             text NOT NULL DEFAULT 'applied' CHECK (stage IN (
    'saved', 'applied', 'recruiter_call', 'tech_screen', 
    'onsite', 'offer', 'accepted', 'rejected', 'withdrawn'
  )),
  
  applied_at        timestamptz,
  stage_updated_at  timestamptz DEFAULT NOW(),
  notes             text,
  
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_apps_user_stage ON public.jarvis_applications (user_id, stage);
CREATE INDEX idx_apps_company ON public.jarvis_applications (company_entity_id);
CREATE INDEX idx_apps_referrer ON public.jarvis_applications (referrer_entity_id) WHERE referrer_entity_id IS NOT NULL;

CREATE TRIGGER trg_apps_updated_at BEFORE UPDATE ON public.jarvis_applications
  FOR EACH ROW EXECUTE FUNCTION jarvis_private.touch_updated_at();

ALTER TABLE public.jarvis_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Applications: owner only" ON public.jarvis_applications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 24: jarvis_interview_prep
CREATE TABLE public.jarvis_interview_prep (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  application_id    uuid REFERENCES public.jarvis_applications(id),
  
  prep_type         text CHECK (prep_type IN ('star_answer', 'question_bank', 'mock_interview', 'research')),
  question          text,
  answer            text,
  feedback          text,
  readiness_score   smallint CHECK (readiness_score BETWEEN 0 AND 100),
  
  concepts_touched  uuid[] DEFAULT '{}',
  
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prep_user ON public.jarvis_interview_prep (user_id);
CREATE INDEX idx_prep_app ON public.jarvis_interview_prep (application_id);

ALTER TABLE public.jarvis_interview_prep ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Interview prep: owner only" ON public.jarvis_interview_prep
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 25: jarvis_career_milestones
CREATE TABLE public.jarvis_career_milestones (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  milestone_type    text CHECK (milestone_type IN (
    'offer_received', 'offer_accepted', 'offer_rejected',
    'promotion', 'resignation', 'onboarding', 'skill_gap_identified'
  )),
  description       text NOT NULL,
  company_entity_id uuid REFERENCES public.jarvis_entities(id),
  
  reflection        text,
  lessons_learned   text,
  
  occurred_at       timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_user ON public.jarvis_career_milestones (user_id, occurred_at DESC);

ALTER TABLE public.jarvis_career_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Milestones: owner only" ON public.jarvis_career_milestones
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SECTOR 8 — HOME/ENVIRONMENT (2 tables)
-- =============================================================================

-- Table 26: jarvis_locations
CREATE TABLE public.jarvis_locations (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  location_type     text CHECK (location_type IN ('home', 'office', 'cafe', 'travel', 'other')),
  name              text,
  lat               numeric(10, 7),
  lng               numeric(10, 7),
  address           text,
  
  arrived_at        timestamptz NOT NULL,
  left_at           timestamptz,
  duration_minutes  integer GENERATED ALWAYS AS (
    CASE WHEN left_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (left_at - arrived_at))::integer / 60
    ELSE NULL END
  ) STORED,
  
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_user_arrived ON public.jarvis_locations (user_id, arrived_at DESC);
CREATE INDEX idx_locations_active ON public.jarvis_locations (user_id) WHERE left_at IS NULL;

ALTER TABLE public.jarvis_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Locations: owner only" ON public.jarvis_locations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 27: jarvis_environment
CREATE TABLE public.jarvis_environment (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  source            text,  -- 'philips_hue', 'co2_monitor', 'pi_sensor', 'manual'
  metric_type       text NOT NULL,  -- 'co2_ppm', 'temperature', 'noise_db', 'light_lux', 'hue_scene'
  value_numeric     numeric,
  value_text        text,
  
  measured_at       timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_env_measured_brin ON public.jarvis_environment USING brin (measured_at);
CREATE INDEX idx_env_user_type ON public.jarvis_environment (user_id, metric_type, measured_at DESC);

ALTER TABLE public.jarvis_environment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Environment: owner only" ON public.jarvis_environment
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SECTOR 9 — IDENTITY (2 tables)
-- =============================================================================

-- Table 28: jarvis_decisions (every significant decision logged)
CREATE TABLE public.jarvis_decisions (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  decision_title    text NOT NULL,
  context           text,
  options_considered jsonb NOT NULL DEFAULT '[]'::jsonb,
  chosen_option     text NOT NULL,
  reasoning         text NOT NULL,
  
  conviction_level  smallint CHECK (conviction_level BETWEEN 1 AND 10),
  reversibility     text CHECK (reversibility IN ('one_way_door', 'two_way_door')),
  
  -- Outcomes tracked at intervals
  outcome_30d       text,
  outcome_90d       text,
  outcome_365d      text,
  rating_retrospective smallint CHECK (rating_retrospective BETWEEN 1 AND 10),
  
  decided_at        timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_decisions_user ON public.jarvis_decisions (user_id, decided_at DESC);
CREATE INDEX idx_decisions_reversibility ON public.jarvis_decisions (reversibility);

CREATE TRIGGER trg_decisions_updated_at BEFORE UPDATE ON public.jarvis_decisions
  FOR EACH ROW EXECUTE FUNCTION jarvis_private.touch_updated_at();

ALTER TABLE public.jarvis_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Decisions: owner only" ON public.jarvis_decisions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 29: jarvis_convictions
CREATE TABLE public.jarvis_convictions (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  conviction_type   text CHECK (conviction_type IN ('value', 'belief', 'preference', 'non_negotiable')),
  statement         text NOT NULL,
  origin_story      text,
  
  strength          smallint CHECK (strength BETWEEN 1 AND 10),
  evidence_events   uuid[] DEFAULT '{}',  -- supporting events
  challenged_events uuid[] DEFAULT '{}',  -- times this was tested
  
  formed_at         timestamptz NOT NULL,
  last_reaffirmed   timestamptz,
  
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_convictions_user ON public.jarvis_convictions (user_id, strength DESC);

CREATE TRIGGER trg_convictions_updated_at BEFORE UPDATE ON public.jarvis_convictions
  FOR EACH ROW EXECUTE FUNCTION jarvis_private.touch_updated_at();

ALTER TABLE public.jarvis_convictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Convictions: owner only" ON public.jarvis_convictions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SECTOR 10 — CREATION (1 table)
-- =============================================================================

-- Table 30: jarvis_creations
CREATE TABLE public.jarvis_creations (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  creation_type     text CHECK (creation_type IN (
    'blog_post', 'tweet', 'code_file', 'component', 'article',
    'video', 'design', 'document', 'jarvis_feature'
  )),
  title             text,
  content           text,
  url               text,
  repo_reference    text,
  
  project_entity_id uuid REFERENCES public.jarvis_entities(id),
  tags              text[],
  
  is_published      boolean DEFAULT false,
  published_at      timestamptz,
  
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW(),
  deleted_at        timestamptz
);

CREATE INDEX idx_creations_user ON public.jarvis_creations (user_id, created_at DESC);
CREATE INDEX idx_creations_type ON public.jarvis_creations (creation_type);
CREATE INDEX idx_creations_content_trgm ON public.jarvis_creations USING gin (content gin_trgm_ops);

CREATE TRIGGER trg_creations_updated_at BEFORE UPDATE ON public.jarvis_creations
  FOR EACH ROW EXECUTE FUNCTION jarvis_private.touch_updated_at();

ALTER TABLE public.jarvis_creations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creations: owner only" ON public.jarvis_creations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SECTOR 11 — TIME (1 table)
-- =============================================================================

-- Table 31: jarvis_rituals
CREATE TABLE public.jarvis_rituals (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  ritual_name       text NOT NULL,  -- 'morning_boot', 'sunday_review', 'evening_debrief'
  scheduled_for     text,  -- cron-like or natural description
  
  occurred_on       date NOT NULL,
  was_followed      boolean NOT NULL,
  skip_reason       text,
  duration_minutes  integer,
  quality_score     smallint CHECK (quality_score BETWEEN 1 AND 10),
  
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  
  UNIQUE (user_id, ritual_name, occurred_on)
);

CREATE INDEX idx_rituals_user_date ON public.jarvis_rituals (user_id, occurred_on DESC);
CREATE INDEX idx_rituals_name ON public.jarvis_rituals (ritual_name);

ALTER TABLE public.jarvis_rituals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rituals: owner only" ON public.jarvis_rituals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SECTOR 12 — LEGACY (3 tables)
-- =============================================================================

-- Table 32: jarvis_achievements
CREATE TABLE public.jarvis_achievements (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  achievement_key   text NOT NULL,  -- 'first_finops_module', 'week_streak', etc.
  title             text NOT NULL,
  description       text,
  icon              text,
  
  progress_current  integer,
  progress_target   integer,
  is_unlocked       boolean DEFAULT false,
  
  unlocked_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  
  UNIQUE (user_id, achievement_key)
);

CREATE INDEX idx_achievements_user_unlocked ON public.jarvis_achievements (user_id, is_unlocked, unlocked_at DESC);

ALTER TABLE public.jarvis_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements: owner only" ON public.jarvis_achievements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 33: jarvis_time_capsule
CREATE TABLE public.jarvis_time_capsule (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  capsule_type      text CHECK (capsule_type IN ('letter', 'prediction', 'commitment', 'memory', 'advice')),
  title             text,
  content           text NOT NULL,
  
  unlock_date       date,  -- when to show this again
  is_unlocked       boolean DEFAULT false,
  
  context_entities  uuid[] DEFAULT '{}',
  
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  unlocked_at       timestamptz
);

CREATE INDEX idx_capsule_user_unlock ON public.jarvis_time_capsule (user_id, unlock_date) WHERE NOT is_unlocked;

ALTER TABLE public.jarvis_time_capsule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Time capsule: owner only" ON public.jarvis_time_capsule
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 34: jarvis_memory_vectors (pgvector — HNSW DISABLED till Pro)
CREATE TABLE public.jarvis_memory_vectors (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  source_table      text NOT NULL,  -- 'conversations', 'decisions', 'check_ins'...
  source_id         uuid NOT NULL,
  
  content_summary   text NOT NULL,  -- what this memory is
  embedding         vector(768),    -- text-embedding-004 dimensions
  
  importance_score  smallint NOT NULL DEFAULT 5 CHECK (importance_score BETWEEN 1 AND 10),
  consolidation_level smallint DEFAULT 0,  -- 0=raw, 1=weekly_summary, 2=monthly, 3=yearly
  
  -- If this is a consolidated memory, link to originals
  consolidated_from uuid[] DEFAULT '{}',
  
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  consolidated_at   timestamptz
);

CREATE INDEX idx_memvec_user_importance ON public.jarvis_memory_vectors (user_id, importance_score DESC);
CREATE INDEX idx_memvec_source ON public.jarvis_memory_vectors (source_table, source_id);
CREATE INDEX idx_memvec_consolidation ON public.jarvis_memory_vectors (consolidation_level, created_at);

-- HNSW INDEX — DISABLED FOR FREE TIER (run after Pro upgrade):
-- CREATE INDEX idx_memvec_embedding_hnsw ON public.jarvis_memory_vectors 
--   USING hnsw (embedding vector_cosine_ops) WITH (m = 24, ef_construction = 100);

ALTER TABLE public.jarvis_memory_vectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Memory vectors: owner only" ON public.jarvis_memory_vectors
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- INTELLIGENCE LAYER (4 tables)
-- =============================================================================

-- Table 35: jarvis_insights (Opus-generated observations)
CREATE TABLE public.jarvis_insights (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  insight_type      text CHECK (insight_type IN (
    'pattern', 'correlation', 'anomaly', 'risk', 'opportunity', 'reflection'
  )),
  title             text NOT NULL,
  content           text NOT NULL,
  
  -- Evidence chain — exactly which events triggered this
  source_event_ids  uuid[] NOT NULL DEFAULT '{}',
  related_entities  uuid[] DEFAULT '{}',
  
  -- AI metadata — IMMUTABLE artifact
  model_provider    text NOT NULL,  -- 'anthropic', 'google'
  model_version     text NOT NULL,  -- 'claude-opus-4-7', 'gemini-3.1-pro'
  generated_at      timestamptz NOT NULL DEFAULT NOW(),
  
  -- User response
  user_rating       smallint CHECK (user_rating BETWEEN 1 AND 5),
  user_accepted     boolean,
  
  importance        smallint NOT NULL DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insights_user_generated ON public.jarvis_insights (user_id, generated_at DESC);
CREATE INDEX idx_insights_type ON public.jarvis_insights (insight_type);
CREATE INDEX idx_insights_importance ON public.jarvis_insights (importance DESC);

ALTER TABLE public.jarvis_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insights: owner only" ON public.jarvis_insights
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 36: jarvis_predictions
CREATE TABLE public.jarvis_predictions (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  prediction_text   text NOT NULL,
  prediction_type   text,  -- 'energy_tomorrow', 'mood_weekend', 'deadline_risk'
  confidence        smallint CHECK (confidence BETWEEN 0 AND 100),
  
  resolution_date   timestamptz NOT NULL,
  outcome_status    text NOT NULL DEFAULT 'pending' CHECK (outcome_status IN (
    'pending', 'hit', 'miss', 'partial', 'invalidated'
  )),
  actual_outcome    text,
  resolved_at       timestamptz,
  
  model_version     text NOT NULL,
  source_event_ids  uuid[] NOT NULL DEFAULT '{}',
  
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_predictions_user_status ON public.jarvis_predictions (user_id, outcome_status);
CREATE INDEX idx_predictions_resolution ON public.jarvis_predictions (resolution_date) WHERE outcome_status = 'pending';

ALTER TABLE public.jarvis_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Predictions: owner only" ON public.jarvis_predictions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 37: jarvis_interventions (what JARVIS suggested & outcome)
CREATE TABLE public.jarvis_interventions (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  intervention_type text CHECK (intervention_type IN (
    'start_assist', 'break_nudge', 'decision_eliminator',
    'mood_check', 'hyperfocus_warning', 'celebration', 'course_correct'
  )),
  suggestion        text NOT NULL,
  context           jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  triggered_by_insight_id uuid REFERENCES public.jarvis_insights(id),
  triggered_by_pattern_id uuid REFERENCES public.jarvis_adhd_patterns(id),
  
  user_response     text CHECK (user_response IN ('accepted', 'rejected', 'ignored', 'deferred')),
  outcome_measured  text CHECK (outcome_measured IN ('helped', 'no_effect', 'worsened', 'unclear')),
  
  suggested_at      timestamptz NOT NULL DEFAULT NOW(),
  responded_at      timestamptz,
  outcome_at        timestamptz
);

CREATE INDEX idx_interventions_user_time ON public.jarvis_interventions (user_id, suggested_at DESC);
CREATE INDEX idx_interventions_type ON public.jarvis_interventions (intervention_type);

ALTER TABLE public.jarvis_interventions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Interventions: owner only" ON public.jarvis_interventions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table 38: jarvis_daily_analysis + jarvis_weekly_analysis (REAL tables, not views)
CREATE TABLE public.jarvis_daily_analysis (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  analysis_date     date NOT NULL,
  
  -- Aggregated stats
  events_count      integer,
  conversations_count integer,
  focus_minutes     integer,
  energy_avg        numeric(3, 1),
  mood_avg          numeric(3, 1),
  
  -- Opus-generated narrative
  summary           text,
  key_moments       jsonb,
  recommendations   jsonb,
  
  model_version     text NOT NULL,
  generated_at      timestamptz NOT NULL DEFAULT NOW(),
  
  UNIQUE (user_id, analysis_date)
);

CREATE INDEX idx_daily_user_date ON public.jarvis_daily_analysis (user_id, analysis_date DESC);

ALTER TABLE public.jarvis_daily_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Daily analysis: owner only" ON public.jarvis_daily_analysis
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.jarvis_weekly_analysis (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.jarvis_users(id),
  
  week_starting     date NOT NULL,
  week_ending       date NOT NULL,
  
  summary           text,
  wins              jsonb,
  losses            jsonb,
  patterns          jsonb,
  next_week_focus   jsonb,
  
  model_version     text NOT NULL,
  generated_at      timestamptz NOT NULL DEFAULT NOW(),
  
  UNIQUE (user_id, week_starting)
);

CREATE INDEX idx_weekly_user_week ON public.jarvis_weekly_analysis (user_id, week_starting DESC);

ALTER TABLE public.jarvis_weekly_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Weekly analysis: owner only" ON public.jarvis_weekly_analysis
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- CORE RPC: log_jarvis_event (CQRS dual-write, atomic, ~15ms)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_jarvis_event(
  p_event_id uuid,
  p_domain text,
  p_event_type text,
  p_payload jsonb,
  p_occurred_at timestamptz,
  p_source_device text DEFAULT NULL,
  p_actor_entity_id uuid DEFAULT NULL,
  p_related_entities uuid[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Idempotent insert — ON CONFLICT for offline sync safety
  INSERT INTO public.jarvis_events (
    id, user_id, domain, event_type, payload,
    occurred_at, source_device, actor_entity_id, related_entities
  ) VALUES (
    p_event_id, v_user_id, p_domain, p_event_type, p_payload,
    p_occurred_at, p_source_device, p_actor_entity_id, p_related_entities
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- NOTE: State-table upserts are handled per-event-type in TypeScript
  -- derivation logic (src/derivation/*.ts). Edge Functions call this RPC
  -- first, then do state-specific upserts as separate queries.
  -- Keeping this function minimal prevents 38-table coupling here.
  
  RETURN p_event_id;
END;
$$;

COMMENT ON FUNCTION public.log_jarvis_event IS 
  'Primary event write RPC. Idempotent via ON CONFLICT. ~15ms latency.
   State table upserts handled in TypeScript derivation layer.';

-- =============================================================================
-- REPLAY FUNCTION (10-year rebuild capability)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.replay_events_in_range(
  p_from timestamptz,
  p_to timestamptz,
  p_domain text DEFAULT NULL
)
RETURNS SETOF public.jarvis_events
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM public.jarvis_events
  WHERE user_id = auth.uid()
    AND occurred_at BETWEEN p_from AND p_to
    AND (p_domain IS NULL OR domain = p_domain)
  ORDER BY occurred_at ASC, id ASC;
$$;

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Seed self entity (to be populated after auth signup — skipped in SQL)
-- This runs from client post-signup:
-- INSERT INTO jarvis_entities (id, user_id, entity_type, name, slug, ...)

-- =============================================================================
-- VERIFICATION QUERIES (run after migration)
-- =============================================================================

-- Count tables
-- SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'jarvis_%';
-- Expected: 38

-- Verify RLS enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'jarvis_%';
-- Expected: all rowsecurity = true

-- Verify indexes
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename LIKE 'jarvis_%';

COMMIT;

-- =============================================================================
-- POST-MIGRATION STEPS (manual, after Pro upgrade):
-- =============================================================================
-- 1. Enable HNSW:
--    CREATE INDEX idx_memvec_embedding_hnsw ON public.jarvis_memory_vectors 
--      USING hnsw (embedding vector_cosine_ops) WITH (m = 24, ef_construction = 100);
--
-- 2. Setup pg_cron for daily/weekly analysis:
--    SELECT cron.schedule('daily_analysis', '50 23 * * *', $$ CALL trigger_daily_analysis(); $$);
--    SELECT cron.schedule('weekly_analysis', '0 0 * * 1', $$ CALL trigger_weekly_analysis(); $$);
--
-- 3. Setup database webhooks for AI triggers:
--    - Dashboard → Database → Webhooks
--    - Trigger: INSERT on jarvis_events with domain IN ('voice', 'check_in')
--    - Target: Edge Function `generate_insight`
--
-- 4. Enable PITR in Supabase dashboard (Pro only)
--
-- 5. Setup weekly pg_dump backup cron on local machine
-- =============================================================================

-- ॐ RADHA RANI KI KRIPA SE — 38 TABLES LIVE 🙏🏽
