-- JARVIS OS Database Schema
-- Run in Supabase SQL Editor (supabase.com → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS jarvis_data (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  device_id TEXT,
  version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_jarvis_data_key ON jarvis_data(key);

CREATE TABLE IF NOT EXISTS jarvis_api_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  model TEXT, mode TEXT,
  input_tokens INTEGER, output_tokens INTEGER,
  latency_ms INTEGER, cost DECIMAL(10,6),
  auto_upgraded BOOLEAN DEFAULT FALSE, reason TEXT
);

CREATE TABLE IF NOT EXISTS jarvis_checkins (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  confidence INTEGER, focus INTEGER, motivation INTEGER,
  sleep INTEGER, meds BOOLEAN, mood TEXT, energy INTEGER,
  learned TEXT, struggled TEXT, journal TEXT,
  chai INTEGER, lunch BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jarvis_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON jarvis_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON jarvis_api_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON jarvis_checkins FOR ALL USING (true) WITH CHECK (true);
