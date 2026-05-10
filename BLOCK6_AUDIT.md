# Block 6 Audit — supabaseSync.js Cleanup

**Date:** 2026-05-11
**Auditor:** Claude Code (Session 81 Block 6 Phase 1)
**Mode:** READ-ONLY. No code changed.

---

## 1. Orchestrator Surface (`src/utils/supabaseSync.js`)

- **Total lines:** 63
- **External imports it owns:** `supabase`, `isSupabaseConfigured`, `DEVICE_ID` from `./supabase.js`
- **Tables touched (3, all stale/wrong):**
  - `jarvis_data` (line 20, 33) — **DROPPED** in v4 schema
  - `jarvis_api_logs` (line 57) — **EXISTS in v4 but schema mismatch** (v4 requires `user_id`, `provider`, `purpose`, `id`; old code sends `mode`, `input_tokens`, `output_tokens`, `cost`, `auto_upgraded`, `reason` — wrong column names)
  - `jarvis_checkins` (line 62) — **DOES NOT EXIST** in v4 (v4 table is `jarvis_check_ins` with underscore, and shape is different)
- **RPC calls:** **none** (this is the old direct-table-write pattern; v4 uses `log_jarvis_event` RPC)
- **Exported functions (5):**

| Function | Signature | Status |
|---|---|---|
| `pushToCloud(key)` | `async (string) → Promise<boolean>` | DEAD — upserts to `jarvis_data` |
| `syncOnBoot()` | `async () → Promise<{synced, pulled?, pushed?}>` | DEAD — selects from `jarvis_data` then loops pushToCloud |
| `pushAllToCloud()` | `async () → Promise<number>` | DEAD — fan-out wrapper over pushToCloud for 21 SYNC_KEYS |
| `logApiCallToCloud(entry)` | `async (object) → Promise<void>` | DEAD — wrong table shape; **also: zero callers anywhere in repo** |
| `logCheckinToCloud(checkin)` | `async (object) → Promise<void>` | DEAD — wrong table name (`jarvis_checkins` vs `jarvis_check_ins`) and wrong column set |

---

## 2. Consumer Inventory

| File | Line(s) | Imports from supabaseSync | localStorage key(s) involved | v4 destination | Category |
|---|---|---|---|---|---|
| `src/App.jsx` | 43, 291 | `syncOnBoot` | all `SYNC_KEYS` (read+write boot pass) | Replace with `useAuth` + on-demand reads from specific v4 tables; boot itself should only log a `BOOT_INITIATED` event (already done in `Boot.jsx`) | **STRIP** |
| `src/hooks/useStorage.js` | 7, 32, 50 | `pushToCloud` | **every `jos-*` key** (40 consumer files write through this) | Per-key routing via `eventLogger` for write-through; bulk pulls handled separately | **REPLACE** (highest blast radius — see §5) |
| `src/components/log/CheckInForm.jsx` | 224 | `logCheckinToCloud` (dynamic) | `jos-feelings` | `jarvis_check_ins` table OR `log_jarvis_event({event_type:'CHECKIN_SUBMITTED', domain:'self', payload:entry})` | **REPLACE** |
| `src/components/settings/Settings.jsx` | 387–388 | `pushAllToCloud` (dynamic) | all `SYNC_KEYS` (manual "Force Full Sync" button) | Either remove the button, or rewrite to emit one `BACKUP_REQUESTED` event and let an Edge Function fan out | **DEFER** (UX feature, not blocking) |
| `src/test/data-integrity.test.js` | 179–219 | `pushToCloud`, `syncOnBoot` (dynamic) | test fixtures only | Tests should be rewritten against the v4 `eventLogger` smoke test, or removed | **STRIP** (remove this `describe` block) |

**Total: 5 consumers** (1 test, 4 production).

---

## 3. Dead References (`jarvis_data` — dropped table)

| File:line | Code snippet | Why it's dead |
|---|---|---|
| `src/utils/supabaseSync.js:20` | `await supabase.from('jarvis_data').upsert(...)` | Table dropped in v4 migration |
| `src/utils/supabaseSync.js:33` | `await supabase.from('jarvis_data').select('key, value, updated_at')` | Same |
| `src/utils/dataIntegrity.js:86` | `.from('jarvis_data').select('value').eq('key', key).single()` | **SURPRISE** — direct ref bypassing supabaseSync; in `repairKey()` recovery path |
| `src/utils/dataIntegrity.js:292` | `fetch('${url}/rest/v1/jarvis_data?select=key&limit=1', ...)` | **SURPRISE** — direct REST call in `runIntegrityCheck()` Cloud probe |

Note: `dataIntegrity.js` is **not** in the supabaseSync consumer list (it doesn't import the wrapper). It hits the dead table directly. Must be cleaned up in the same block.

---

## 4. Console Error Baseline (expected on every boot, today)

No Sentry log exists in repo. Documented expected 404 pattern from code paths:

1. **App.jsx boot** (`syncOnBoot`):
   - `GET /rest/v1/jarvis_data?select=key,value,updated_at` → **404** → console: `SUPABASE SYNC: relation "public.jarvis_data" does not exist`
   - Then for each of up to 21 SYNC_KEYS present locally: `POST /rest/v1/jarvis_data` upsert → **404** → console: `CLOUD PUSH: <key> relation "public.jarvis_data" does not exist`
2. **Every `useStorage.set` / `useStorage.update`** (any tab interaction, every check-in, every task toggle): `POST /rest/v1/jarvis_data` → **404** + console error. Hundreds per session.
3. **CheckInForm submit:** `POST /rest/v1/jarvis_checkins` → **404** (table name mismatch — old code drops underscore).
4. **Settings "Force Full Sync":** 21 sequential 404s.
5. **dataIntegrity.runIntegrityCheck:** `GET /rest/v1/jarvis_data?select=key&limit=1` → **404** → shows "⚠️ Supabase 404" in integrity report.
6. **dataIntegrity.repairKey** (only fires when a key is corrupted): `GET /rest/v1/jarvis_data?select=value` → **404** → silent catch, falls through to defaults.

**Net effect described in Session 80 Block 5 log:** "404 spam each boot" + "Streak UI shows 1-day at risk" (the cloud probe fails → integrity report flags Cloud as unhealthy → cascades).

**Cleanup verification target:** zero `jarvis_data` requests, zero `jarvis_checkins` requests, zero "relation does not exist" log lines across a clean boot.

---

## 5. Risk Assessment

**Highest blast radius (top 3):**

1. **`src/hooks/useStorage.js`** — every single write to `jos-*` flows through here. 40 consumer files import `useStorage`; collectively ~90 call sites. Removing `pushToCloud` cleanly is mechanical (delete two lines + the import); replacing with an `eventLogger` write-through is the big design call for Phase 2. *This is the only file in the audit whose change touches the whole app.*
2. **`src/App.jsx`** — boot orchestrator. `syncOnBoot()` runs once but its failure flips the dataIntegrity Cloud probe, which is what surfaces the "at risk" UI to the user. Pure leaf strip: delete import + ref-guarded effect block (lines 287–293). Low code risk, high UX-noise reduction.
3. **`src/utils/dataIntegrity.js`** — not a supabaseSync consumer, but it independently knows about `jarvis_data` in two places. Risky because: (a) `repairKey()` is the recovery path used when localStorage is corrupted — if we strip it without a v4 replacement, corrupted-key recovery silently downgrades to "defaults only"; (b) `runIntegrityCheck()` is what powers the boot health card. Needs a deliberate v4-aware rewrite, not a strip.

**Leaf nodes (low risk):**

- `CheckInForm.jsx` — single line, fire-and-forget dynamic import. Easy strip or one-line replace with `eventLogger`.
- `Settings.jsx` — one button handler, dynamic import. Easy to gut.
- `data-integrity.test.js` — one `describe` block (lines 175–220), no production impact.

**Hidden landmine:** `logApiCallToCloud` is exported with zero callers — already-orphaned. Deleting it has no consumer impact. (Note: `useAI.js` does log API calls but only via `apiLogger.js` → `jos-api-logs` localStorage; it does NOT call `logApiCallToCloud`.)

---

## Recommended Strategy (counts)

- **STRIP:** 3 (`App.jsx` syncOnBoot import+call; `data-integrity.test.js` supabaseSync describe block; `logApiCallToCloud` orphan export)
- **REPLACE:** 2 (`useStorage.js` pushToCloud → eventLogger write-through; `CheckInForm.jsx` logCheckinToCloud → `log_jarvis_event` or `jarvis_check_ins` upsert)
- **DEFER:** 1 (`Settings.jsx` "Force Full Sync" — UX feature, decide policy first)
- **EXTRA (out-of-scope but coupled):** 1 (`dataIntegrity.js` — 2 direct `jarvis_data` refs; must be rewritten or gated alongside)

Once `useStorage` no longer imports `supabaseSync`, the `App.jsx` import is the last production-code reference. After both go, `supabaseSync.js` itself can be deleted in the same commit.
