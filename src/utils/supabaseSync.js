// supabaseSync.js — Bidirectional sync: localStorage (cache) ↔ Supabase (truth)
import { supabase, isSupabaseConfigured, DEVICE_ID } from './supabase.js'

const SYNC_KEYS = [
  'jos-core', 'jos-feelings', 'jos-concepts', 'jos-achievements', 'jos-settings',
  'jos-weekly', 'jos-interviews', 'jos-commitments', 'jos-morning-bets',
  'jos-session-timer', 'jos-quick-capture', 'jos-daily-build', 'jos-backup',
  'jos-knowledge', 'jos-decisions', 'jos-applications', 'jos-battle-plan',
  'jos-onboarding', 'jos-identity', 'jos-journal', 'jos-voice-echo',
]

export async function pushToCloud(key) {
  if (!isSupabaseConfigured()) return false
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return false
    const { error } = await supabase.from('jarvis_data').upsert(
      { key, value: JSON.parse(raw), updated_at: new Date().toISOString(), device_id: DEVICE_ID },
      { onConflict: 'key' }
    )
    if (error) { console.error('CLOUD PUSH:', key, error.message); return false }
    return true
  } catch { return false }
}

export async function syncOnBoot() {
  if (!isSupabaseConfigured()) { console.log('SUPABASE: not configured, localStorage only'); return { synced: false } }
  console.log('SUPABASE: boot sync...')
  try {
    const { data, error } = await supabase.from('jarvis_data').select('key, value, updated_at')
    if (error) { console.error('SUPABASE SYNC:', error.message); return { synced: false } }
    let pulled = 0, pushed = 0
    for (const row of (data || [])) {
      localStorage.setItem(row.key, JSON.stringify(row.value)); pulled++
    }
    for (const key of SYNC_KEYS) {
      if (localStorage.getItem(key) && !data?.find(r => r.key === key)) { await pushToCloud(key); pushed++ }
    }
    console.log(`SUPABASE SYNC: pulled ${pulled}, pushed ${pushed}`)
    return { synced: true, pulled, pushed }
  } catch (e) { console.error('SUPABASE SYNC FAILED:', e); return { synced: false } }
}

export async function pushAllToCloud() {
  if (!isSupabaseConfigured()) return 0
  let count = 0
  for (const key of SYNC_KEYS) { if (await pushToCloud(key)) count++ }
  console.log(`SUPABASE FULL PUSH: ${count}/${SYNC_KEYS.length}`)
  return count
}

export async function logApiCallToCloud(entry) {
  if (!isSupabaseConfigured()) return
  try { await supabase.from('jarvis_api_logs').insert({ model: entry.model, mode: entry.mode, input_tokens: entry.inputTokens, output_tokens: entry.outputTokens, latency_ms: entry.latencyMs, cost: entry.cost, auto_upgraded: entry.autoUpgraded, reason: entry.reason }) } catch { /* silent */ }
}

export async function logCheckinToCloud(checkin) {
  if (!isSupabaseConfigured()) return
  try { await supabase.from('jarvis_checkins').upsert({ date: checkin.date, confidence: checkin.confidence, focus: checkin.focus, motivation: checkin.motivation, sleep: checkin.sleep, meds: checkin.meds, mood: checkin.mood, energy: checkin.energy, learned: checkin.learned, struggled: checkin.struggles, journal: checkin.journal, chai: checkin.chai, lunch: checkin.lunch }, { onConflict: 'date' }) } catch { /* silent */ }
}
