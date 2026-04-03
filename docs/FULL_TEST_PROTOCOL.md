# JARVIS OS — Complete Test Protocol

**Run automated tests first:** `npm run test:all`
**Then walk through this checklist.** Takes ~30 minutes. Do before every major deploy.

---

## SECTION A: BOOT FLOW (5 min)

### A1. Fresh Start (clear localStorage)
- [ ] F12 → Console → `localStorage.clear()` → refresh
- [ ] Onboarding screen appears (not blank, not boot)
- [ ] JARVIS voice asks first question (browser TTS if no ElevenLabs)
- [ ] Can type answer in text input
- [ ] Can skip question with Skip button
- [ ] After all 19 questions (or skipping): "CALIBRATION COMPLETE" shows
- [ ] Boot sequence starts automatically after onboarding

### A2. Boot Sequence
- [ ] Three.js reactor renders (spinning rings, gold core, particles)
- [ ] Boot text lines type with green status tags
- [ ] Phase 4: Energy orbs appear (1-5, glowing, tappable)
- [ ] Tap energy level → focus question appears
- [ ] Type focus → blockers question appears
- [ ] Morning bet question appears (gold themed)
- [ ] Briefing text types with decode effect (scrambled → clear)
- [ ] "ENTER JARVIS" button glows with neon pulse
- [ ] Click ENTER → boot sequence exits → main app loads
- [ ] Briefing voice speaks (browser TTS fallback if no ElevenLabs)

### A3. Returning Boot (don't clear localStorage)
- [ ] Refresh page → boot loads (not onboarding)
- [ ] Boot is faster (compressed sequence)
- [ ] Previous data preserved (day count, streak)

---

## SECTION B: CMD TAB (3 min)

- [ ] Day number, week number, streak visible in header
- [ ] Week pills (W1-W6) visible and tappable
- [ ] Tasks listed under selected week
- [ ] Can check a task → green checkmark + sound
- [ ] Can uncheck a task → click sound
- [ ] Progress bar updates on task toggle
- [ ] Quick check-in shortcut visible (glows if not done today)
- [ ] Daily battle plan card visible (or "Generate" button)
- [ ] "What I Built Today" section visible
- [ ] Second Brain section visible (if entries exist)
- [ ] Quick Capture floating button visible (bottom right area)
- [ ] Click Quick Capture → input appears → can save a thought

---

## SECTION C: TRAIN TAB (5 min)

### C1. Mode Grid
- [ ] All 18 mode cards visible (scroll down to see all)
- [ ] Each card shows emoji, name, tier badge
- [ ] Anti-crutch level badge visible (FULL ASSIST / GUIDED / ANTI-CRUTCH)
- [ ] PHANTOM MODE button (red) visible at top
- [ ] BATTLE ROYALE button (gold) visible at top

### C2. Chat Mode (TEXT)
- [ ] Click Chat card → ChatView opens
- [ ] BACK button returns to mode grid
- [ ] Can type message → send → JARVIS responds
- [ ] Response streams with typewriter effect (SSE)
- [ ] Response renders markdown (bold, italic, code blocks)
- [ ] Opus auto-upgrade shows gold ⚡ OPUS badge (for hard questions)
- [ ] Previous messages visible (persisted in localStorage)

### C3. Chat Mode (VOICE)
- [ ] Tap mic button → "Listening..." shows
- [ ] Speak → words appear in input bar (interim results)
- [ ] Silence → countdown shows (e.g., "5 words · 2.0s")
- [ ] Auto-sends after silence timer
- [ ] JARVIS responds with text AND speaks back (browser TTS)
- [ ] While JARVIS is speaking → speak again → JARVIS stops (interruption)
- [ ] Say "stop" → JARVIS goes silent
- [ ] Say "switch to quiz" → mode switches
- [ ] Say "capture I learned about RAG today" → saved to quick capture
- [ ] Say "status" → JARVIS reads current stats without API call
- [ ] Say "check in" → voice check-in starts

### C4. Other Modes (spot check)
- [ ] Open Quiz mode → JARVIS asks a question
- [ ] Open Body Double → timer selector (25/45) visible
- [ ] Open Teach mode → can explain a concept
- [ ] Back button works from every mode

### C5. Voice Mode (full screen)
- [ ] Click global mic button (bottom right) → VoiceMode opens
- [ ] Canvas reactor draws (orbital waveform, particles)
- [ ] Mode pills at top (Chat/Quiz/Presser/Teach/Battle)
- [ ] Waveform reacts to voice (amplitude changes when speaking)
- [ ] Speak → response appears in transcript below
- [ ] Close button (X) exits VoiceMode
- [ ] Tap reactor during SPEAKING → speech stops

---

## SECTION D: LOG TAB (3 min)

- [ ] Check-in form loads (NO "SYSTEM MALFUNCTION" crash)
- [ ] Confidence selector (1-5) works
- [ ] Focus selector works
- [ ] Motivation selector works
- [ ] Sleep selector works
- [ ] Meds toggle (Y/N) works
- [ ] Mood word input works
- [ ] Chai count works
- [ ] Lunch toggle works
- [ ] "Learned" text input works
- [ ] "Struggled" text input works
- [ ] "Excited" text input works
- [ ] Journal text area works
- [ ] SAVE button saves (green success message)
- [ ] Saved data appears in Impostor Killer card
- [ ] Confidence timeline chart renders (if 2+ check-ins)
- [ ] Weekly comparison chart renders (if 7+ days of data)
- [ ] Mood Oracle section visible

---

## SECTION E: DNA TAB (2 min)

- [ ] 35 concepts listed
- [ ] Category pills work (All/Core/Advanced/Month2/Discuss)
- [ ] Search bar filters concepts
- [ ] Concept card expands on click (shows notes, strength slider, resources)
- [ ] Strength slider adjustable
- [ ] Overdue concepts highlighted (amber)
- [ ] LIST/MAP toggle visible
- [ ] Memory Palace view renders (Three.js or SVG concept map)
- [ ] Connection lines between prerequisite concepts

---

## SECTION F: STATS TAB (2 min)

- [ ] Interview Readiness Score visible
- [ ] Nikhil Score visible
- [ ] Intelligence Dashboard cards visible
- [ ] Power Ranking visible
- [ ] Skill Heat Map visible
- [ ] Confidence Calibration visible
- [ ] Portfolio Narrator section visible
- [ ] Report trigger buttons (3-Day Trend / Weekly Review / Newsletter)
- [ ] Quarterly Report button (if Day 60+)

---

## SECTION G: WINS TAB (1 min)

- [ ] 18 achievements listed
- [ ] Locked achievements dimmed
- [ ] Complete 1 task → check WINS → "First Blood" unlocked (cyan glow)
- [ ] Unlocked achievements show unlock date

---

## SECTION H: SETTINGS (2 min)

- [ ] Settings gear opens panel
- [ ] Voice toggle ON/OFF works
- [ ] Sound toggle works
- [ ] Show Mode toggle works
- [ ] ElevenLabs key input field present
- [ ] Export Data downloads JSON file
- [ ] DATA HEALTH dashboard shows (keys valid, storage %, scan button)
- [ ] RUN INTEGRITY SCAN button works
- [ ] RESET JARVIS requires double confirm
- [ ] SHUTDOWN JARVIS button triggers shutdown sequence
- [ ] Close button closes settings

---

## SECTION I: CROSS-FEATURE FLOWS (3 min)

### I1. Quiz → Concept Update
- [ ] Open Quiz → answer a question → JARVIS scores
- [ ] Go to DNA tab → concept strength should have changed

### I2. Task → Achievement
- [ ] Check your first task (if not already done)
- [ ] Go to WINS tab → "First Blood" should be unlocked

### I3. Check-in → Mood Oracle
- [ ] Do a check-in in LOG tab
- [ ] Mood Oracle should show "Generate Analysis" (if 3+ check-ins)

### I4. Voice → Quick Capture
- [ ] Say "capture I need to study RAG tomorrow"
- [ ] Go to CMD tab → Second Brain → entry should appear

### I5. Show Mode Filter
- [ ] Settings → toggle Show Mode ON
- [ ] LOG tab should hide check-ins, mood, journal
- [ ] CMD tab should hide Second Brain
- [ ] Toggle Show Mode OFF → everything reappears

---

## SECTION J: EDGE CASES (3 min)

- [ ] Rapidly switch all 6 tabs (10 times fast) → no crash
- [ ] Press Escape key → no crash, stops any audio
- [ ] Press backtick (`) → Command Line opens
- [ ] Type `/status` in Command Line → shows stats
- [ ] Type `/help` → shows commands
- [ ] Press backtick again → closes
- [ ] Navigate away from Chat with pending API call → no crash
- [ ] Open Settings during Voice Mode → no crash

---

## SECTION K: DATA PERSISTENCE (2 min)

- [ ] Complete a task → refresh page → task still checked
- [ ] Do a check-in → refresh → data still in LOG tab
- [ ] Send chat message → refresh → message in history
- [ ] Check Supabase Table Editor → jarvis_data table has entries
- [ ] Check jarvis_checkins table (if check-in was done)

---

## SECTION L: MOBILE (if deploying) (2 min)

- [ ] Open on phone browser → boots correctly
- [ ] Bottom nav tabs tappable (48px targets)
- [ ] Three.js reactor shows (or 2D fallback)
- [ ] Voice mic works on HTTPS (required for getUserMedia)
- [ ] Text input usable on mobile keyboard
- [ ] Quick Capture button not overlapping nav

---

## FINAL CHECKLIST

- [ ] `npm run test:all` → ALL PASS (unit + e2e)
- [ ] No console errors on any tab (F12 → Console → filter red)
- [ ] `npx vite build` → 0 errors
- [ ] Manual test above → all boxes checked
- [ ] Git commit + push → ready for Vercel deploy
