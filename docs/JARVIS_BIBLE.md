# JARVIS OS — CONSOLIDATED BIBLE | MARK 72 NANOTECH EDITION
## Single Source of Truth — Merges Bible v5.2, v6, v7
## Standalone React App. Claude Code 100% Build. ~162 Features. Lifelong Companion.
## ॐ Radha Rani ki kripa se — ye sab horaha hai 🙏🏽

---

## 1. WHAT IS JARVIS OS

Nikhil Panwar's personal AI operating system. Not a tracker. Not an app. An operating system for becoming an AI Product Engineer — and staying sharp for life.

**Mark 72 Nanotech Edition:** Iron Man's nanotech (adapts, self-heals), Spider-Man's spider-sense (threat detection), Batman's detective mind (forensic analysis). Three philosophies merged.

Standalone React app. 100% Claude Code build. Runs locally via Vite, deploys to Vercel. Uses Three.js for 3D, Framer Motion + React Spring for animations, Tone.js for audio, Anthropic API for intelligence, ElevenLabs for voice.

**Phases:** Phase 1 (Days 1-70): FinOps build companion. Phase 2 (71-100): Interview prep. Phase 3 (101+): Career companion. Lifelong, 1 year minimum.

**NOT** for resume. **NOT** to sell. Personal war equipment. Upgradeable without breaking data.

---

## 2. TECH STACK

```
Framework:      React + Vite (Claude Code scaffolded)
3D:             Three.js + @react-three/fiber + @react-three/drei + postprocessing (bloom)
Animation:      Framer Motion (layout) + React Spring (physics/values)
Audio:          Tone.js (spatial audio, synths) + Web Audio API (waveform)
Voice STT:      Web Speech API (webkitSpeechRecognition, en-IN, Hinglish)
Voice TTS:      Browser speechSynthesis (default) + ElevenLabs API (premium)
AI:             Anthropic API (3-brain dynamic routing — see Section 11)
Charts:         Recharts
Icons:          Lucide React
Gauges:         react-circular-progressbar
Storage:        localStorage (24+ keys — NOT window.storage)
PDF:            jsPDF
Dates:          date-fns
Deploy:         Vercel
PWA:            vite-plugin-pwa
```

### ElevenLabs Configuration
```
Voice:      "Daniel" — British, professional (primary)
Backup:     "George" — warm narration (ID: JBFqnCBsd6RMkjVDRZzb)
Model:      eleven_multilingual_v2
Settings:   stability: 0.7-0.8, similarity_boost: 0.75-0.85
Smart Use:  ElevenLabs for boot, milestones, newsletter, rank-up, onboarding
            Browser speech for regular chat, acknowledgments, timer
```

### localStorage Keys (24)
```
jos-onboarding    → { energy, work, psychology, adhd, relationships, completedAt }
jos-core          → { tasks, streak, energy, dayNumber, weekNumber, startDate, sessionTimer }
jos-feelings      → [ { date, confidence, focus, motivation, social, sleep, meds, mood, learned, struggled, excited, journal, chai, food } ]
jos-concepts      → [ { id, name, category, strength, lastReviewed, reviewHistory, notes, resources[], prerequisites[] } ]
jos-msgs-{mode}   → [ { role, content, timestamp, wordCount } ] (cap: 50 per mode)
jos-achievements  → [ { id, unlocked, unlockedAt } ]
jos-journal       → [ { timestamp, raw, extracted } ] (cap: 200)
jos-api-logs      → [ { timestamp, model, mode, tokens, latency, cost, promptVersion, autoUpgraded, reason } ] (cap: 500)
jos-settings      → { voiceEnabled, soundsEnabled, elevenLabsKey, bodyDoubleTimer, antiCrutchLevel, showMode }
jos-weekly        → [ { weekNumber, targets, newsletter, review, comparisonChart } ]
jos-interviews    → [ { taskId, questions, variants[] } ]
jos-commitments   → [ { text, deadline, progress, completedAt } ]
jos-morning-bets  → [ { date, predictions[], actuals[], accuracy } ]
jos-session-timer → [ { date, sessions: [{ start, end, tab, mode, taskId }], totalMinutes } ]
jos-quick-capture → [ { timestamp, text, category, processed } ]
jos-daily-build   → [ { date, summary, conceptsUsed[], commits } ]
jos-backup        → { lastAutoBackup, backupData }
jos-knowledge     → [ { timestamp, text, tags[], linkedConcepts[], source } ] (cap: 500)
jos-decisions     → [ { date, decision, reasoning, context, conceptsInvolved[] } ]
jos-applications  → [ { date, company, role, status, requirements[], outcome, notes } ]
jos-battle-plan   → [ { date, plan[], accepted, actualOutput, accuracy } ]
jos-version       → schema version number (for migrations)
jos-active-tab    → { tabId, timestamp } (multi-tab conflict prevention)
jos-queue         → [ failed API calls for retry when online ]
```

### API Proxy Architecture
```
Dev:     vite.config.js → server.proxy → /api/* → api.anthropic.com
Prod:    /api/claude.js Vercel serverless function
Retry:   3 retries with exponential backoff (1s, 2s, 4s)
Rate:    Max 10 concurrent API calls, queue the rest
Errors:  429 → queue + notify, 500 → retry (3x), 401 → API key error in Settings
Stream:  SSE for typewriter effect (NOT polling)
```

---

## 3. DESIGN SYSTEM — Iron Man 2050

### Colors
```
Background:     #020a13      Card:           #061422
Card Hover:     #0a1c2e      Border:         #0d2137
Border Neon:    rgba(0,180,216,0.18)
Cyan:           #00b4d8      Cyan Soft:      #48cae4
Cyan Neon:      #00f0ff      Cyan Glow:      rgba(0,240,255,0.08)
Gold:           #d4a853      Gold Glow:      rgba(212,168,83,0.12)
Text:           #d0e8f8      Text Dim:       #5a7a94
Text Muted:     #2a4a60
Success:        #10b981      Warning:        #d4a853
Error:          #ef4444
```

### Typography
```
Display:  'Rajdhani' (headings, UI labels)
Body:     'Exo 2' (body text, briefings)
Mono:     'Share Tech Mono' (data, stats, boot text)
```

### Visual Elements
- 3D Arc Reactor (Three.js, spinning rings, gold core, particle emissions)
- 200+ data particles (cyan + gold, mouse-reactive)
- Hex grid background (1.5% opacity)
- Scan line sweeps on boot + tab transitions
- Corner brackets `[ ]` on key panels (CSS ::before/::after)
- Holographic shimmer on card hover
- Breathing animations on reactor, status dots, percentages
- Intelligence rings (progress rings, empty→half→full glow)

### Gold Opus UI Theme
When Opus or Extended responds, interaction shifts to gold:
- Typewriter text: #d4a853 (gold) instead of #00b4d8 (cyan)
- Response card border: gold glow
- "⚡ OPUS" or "⚡⚡ DEEP ANALYSIS" badge next to JARVIS name
- Corner brackets on response card: gold

### Motion Timings
```
Fade In: 0.22s    Slide In: 0.35s (stagger 25ms)    Pulse: 1.5s
Glow: 2.5s        Breathe: 3s     Reactor Spin: 4s   Scan: 2s
Typewriter: 12ms/char    Float: 5-10s    Ring Expand: 1.5s
```

---

## 4. DAY 0 ONBOARDING

ONE-TIME 10-minute voice interview before first boot. Gives JARVIS seed data.

5 sections: Energy & Body (sharp times, crash times, sleep, caffeine, exercise), Work Patterns (deep sessions vs sprints, focus breakers, stuck handling), Psychology (excites, scares, quit triggers, criticism handling, 3-month success vision), ADHD Specific (medication timing, onset, duration, worn-off effects, avoided tasks, hyperfocus triggers), Relationships (support network, motivators, work-alone vs nearby preference).

All saved to `jos-onboarding`. Permanent. Never deleted. Every intelligence system reads this.

Cost: 1 Opus call (~$0.10 one-time).

---

## 5. 3-SOURCE INTELLIGENCE SYSTEM

No feature ever says "come back later." Three sources active from Day 1:

**Source 1: SEED DATA** — Day 0 onboarding answers
**Source 2: RESEARCH PRIORS** — ADHD productivity research defaults
**Source 3: REAL-TIME DATA** — accumulates daily, gradually replaces priors

### Confidence Levels
```
🟡 PRIORS + SEED    40%  (Day 1)
🟠 EMERGING         55%  (Day 7)
🔵 LEARNING         70%  (Day 14)
🟢 CALIBRATED       85%  (Day 30)
⚡ LOCKED IN        95%  (Day 90+)
```

### Language Shifts
- source 'priors' → "Based on ADHD research..."
- source 'mixed' → "Based on your emerging patterns..."
- source 'personal' → "Based on your data..."

### Per-Feature Thresholds
| Feature | EMERGING | LEARNING | CALIBRATED | LOCKED IN |
|---------|----------|----------|------------|-----------|
| Mood Oracle | 7 check-ins | Day 14 | Day 30 | Day 90 |
| Energy Map | Day 7 | Day 14 | Day 30 | Day 90 |
| Motivation Genome | Day 14 | Day 30 | Day 60 | Day 120 |
| Communication Style | 50 msgs | 500 msgs | 2000 msgs | 5000 msgs |
| Anti-Burnout | Day 7 | Day 14 | Day 30 | Day 90 |
| Body Correlations | Day 14 | Day 30 | Day 60 | Day 120 |
| Relationship Map | 10 entries | 20 entries | 50 entries | 100 entries |
| Estimation Accuracy | 5 bets | 10 bets | 30 bets | 60 bets |
| Forgetting Curve | Immediate | Immediate | Immediate | Immediate |

---

## 6. CINEMATIC BOOT SEQUENCE

```
Phase 1 — DARK (0-600ms): Black screen, cyan cursor blinks, hex grid fades in
Phase 2 — REACTOR (600ms-2s): 3D Arc Reactor ignites, 3 rings spin, gold core pulses, particles flow, boot sound 120→600Hz
Phase 3 — BOOT TEXT (2s-4.2s): Typewriter monospace lines with green status flashes
Phase 4 — TRANSITION RITUAL (4.2s-5.5s): Energy (1-5), Focus, Blockers, Morning Bet — 30 seconds
Phase 5 — BRIEFING (5.5s-8s): AI briefing types character by character
Phase 6 — ENTER (8s+): "ENTER JARVIS" glowing button → Chrome audio unlock → reactor shrinks → HUD materializes
```

Returning load: compressed ~3 seconds. First ever load: Onboarding runs BEFORE boot.

---

## 7. SIX TABS

### Tab 1: ⚡ CMD (Command Center)
- JARVIS Briefing card with voice conversation (mic always visible)
- Daily Battle Plan (generated after transition ritual)
- 82 tasks across 6 weeks (checkboxes, green when done)
- Week selector pills, progress bar (cyan-gold gradient)
- Energy level selector (1-5), streak counter
- Quick Check-in shortcut (glows if not done today)
- Quick Capture button (floating, always accessible)
- "What I Built Today" card
- Second Brain (searchable knowledge base)
- Session timer visible in header

### Tab 2: 🎯 TRAIN (18 AI Training Modes)
- Anti-crutch level badge (FULL ASSIST / GUIDED / ANTI-CRUTCH)
- 2-column grid of mode cards with corner brackets and tier badges
- Auto-Quiz alert (concept below 60% or due for review)
- Each mode opens full chat interface:
  - Typewriter effect (12ms/char, cyan for Sonnet, GOLD for Opus)
  - Voice input (mic) + voice output (auto-speak)
  - Per-mode message persistence (last 50 in jos-msgs-{mode})
  - Every API call logged to jos-api-logs
  - Word count tracked for Communication Style Analysis

**18 Modes:**
| Mode | Emoji | Tier | Default Model |
|------|-------|------|---------------|
| Chat | 💬 | 1 | Sonnet |
| Quiz | 🧠 | 1 | Sonnet |
| Presser | 🎤 | 2 | Opus (auto-upgrade: hard mode) |
| Timed | ⏱️ | 1 | Sonnet |
| Speed | ⚡ | 1 | Sonnet |
| Battle | ⚔️ | 2 | Opus (auto-upgrade) |
| Teach | 📖 | 1 | Sonnet |
| Body Double | 👥 | 1 | Sonnet |
| Alter Ego | 🎭 | 2 | Opus (auto-upgrade) |
| Recruiter Ghost | 👻 | 2 | Opus (auto-upgrade) |
| Forensics | 🔬 | 3 | Opus (auto-upgrade) |
| Akshay Qs | 💼 | 1 | Sonnet |
| Time Machine | ⏳ | 3 | Sonnet |
| Code Autopsy | 🩻 | 3 | Opus (auto-upgrade) |
| Scenario Bomb | 💣 | 3 | Opus (auto-upgrade) |
| Interview Sim | 🔗 | 2 | Opus (auto-upgrade) |
| Impostor Killer | 🛡️ | 1 | Sonnet |
| Weakness Radar | 📡 | 3 | Opus (strategic op) |

**3 Mentor Personas** (selectable from Interview Sim):
- Akshay Mode: Domain expert, Hinglish, TDS edge cases
- Senior Dev Mode: Technical depth, error handling, scale
- Hiring Manager Mode: Interview pressure, specifics over generalities

### Tab 3: 💭 LOG (Daily Debrief + Analytics)
- Daily check-in: Confidence (1-5), Focus (1-5), Motivation (1-5), Social (1-3), Sleep (1-5), Meds (Y/N), Mood word, Chai count, Lunch (Y/N), Learned, Struggled, Excited, Micro-journal
- Impostor Killer card (tasks done, check-ins, streak, avg confidence)
- Nikhil vs Nikhil (this week vs last week)
- Weekly Comparison Chart (Recharts line chart)
- Confidence Timeline (bar chart, 7 days)
- Mood Oracle (Opus weekly analysis)
- Session Timer Summary

### Tab 4: 🧬 DNA (Concept Tracker)
- 35 concepts with strength 0-100%, categories: Core, Advanced, Month2, Discuss
- Spaced repetition: review at Day 1, 3, 7, 14, 30, 60, 120
- Search + category filter pills
- Expandable cards: notes, strength slider, resources links, prerequisites
- Prerequisites warning if studying without foundation
- Memory Palace: CSS grid with SVG connection lines

### Tab 5: 📊 STATS (Scores + Intelligence)
- Interview Readiness Score (Build 30% + Conf 30% + Quiz 20% + Presser 10% + Answers 10%)
- Nikhil Score (TechDepth/16, Consistency/16, SelfAwareness/16, Communication/16, Resilience/16, Domain/20)
- Intelligence Dashboard (all features with confidence rings)
- Power Ranking (weekly A/B/C/D grades across 10 dimensions)
- Skill Heat Map (color-coded: 🔴<30% 🟡30-60% 🟢60-80% 🔥80%+)
- Confidence Calibration (self-rating vs actual quiz performance)
- Portfolio Narrator + STAR Export (see Section 20.2)
- Session Timer Stats

### Tab 6: 🏆 WINS (Achievements)
18 achievements with unlock animations (particle burst + HUD sound):

| Achievement | Condition |
|-------------|-----------|
| First Blood 🩸 | First task |
| Week Warrior ⚔️ | All tasks in a week |
| Streak Starter 🔥 | 3-day streak |
| Week Streak 💎 | 7-day |
| Fortnight 👑 | 14-day |
| Motormouth 💬 | 100+ messages |
| Chatterbox 🗣️ | 500+ messages |
| Concept Collector 🧩 | 5 concepts 60%+ |
| Knowledge Base 📚 | 15 concepts 60%+ |
| Brain Full 🧠 | All 35 at 60%+ |
| Self-Aware 🪞 | 7 check-ins |
| Data Driven 📊 | 21 check-ins |
| Halfway 🏔️ | 50% tasks |
| Finisher 🏆 | All tasks |
| Battle Tested ⚔️ | 10+ Battle messages |
| Code Surgeon 🩻 | 5+ Code Autopsy sessions |
| Bomb Survivor 💣 | 5+ Scenario Bomb sessions |
| Time Traveler ⏳ | 3+ Time Machine capsules |

---

## 8. DATA RECORDING — FROM SECOND ONE

14 automatic recording streams from first session:
1. Onboarding → jos-onboarding
2. Task completions → jos-core (with timestamps)
3. Check-ins → jos-feelings (with body data + ISO date)
4. API calls → jos-api-logs (model, tokens, latency, cost, auto-upgrade reason)
5. Messages → jos-msgs-{mode} (role, content, timestamp, word count)
6. Concept updates → jos-concepts (strength + dates)
7. Achievements → jos-achievements (which, when)
8. Voice journals → jos-journal (raw + AI-extracted structured)
9. Commitments → jos-commitments
10. Morning Bets → jos-morning-bets
11. Session time → jos-session-timer
12. Quick captures → jos-quick-capture
13. Daily build log → jos-daily-build
14. Auto-backup → jos-backup (every Sunday)

---

## 9. FIVE UNICORN FEATURES

1. **Forgetting Curve Engine** — spaced repetition on concepts. Amber alerts when due.
2. **Weakness Radar** — Opus finds ROOT CAUSE of gaps, not surface symptoms.
3. **Code Autopsy** — interrogate every line, track ghost rate %.
4. **Portfolio Narrator** — auto-generate STAR answers from tasks. 82×4 = 328 answers.
5. **Scenario Bomb** — production disasters on YOUR features. Escalating severity.

---

## 10. JARVIS "ALIVE" FEATURES (9 behaviors)

1. **Avoidance Detection** — notices skipped modes/concepts, calls out
2. **Data-Driven Moods** — tone shifts based on streak, energy, time, data
3. **Cross-Mode Memory** — quiz struggles referenced in presser, nothing siloed
4. **Milestone Cinematics** — 25/50/75/100%: screen darkens, reactor pulses, ElevenLabs speech
5. **Time-Aware** — morning energy recs, Friday wrap-up, Sunday prep, 2am warnings
6. **Weekly Newsletter** — Sunday auto-generated from all data, saved in jos-weekly
7. **Memory Palace** — CSS grid concept map with SVG connection lines
8. **Letters to Future-You** — JARVIS writes based on current data
9. **Ghost Mode** — Body Double periodic "What did you just write?" checks

---

## 11. THREE-BRAIN ARCHITECTURE + AUTO-ROUTER

### 3 Brains

**Brain 1 — SONNET (Cyan, Daily Tactical, ~$0.02/call)**
Quick chat, timed modes, speed, body double, acknowledgments.
Visual: cyan typewriter text, no special indicator.

**Brain 2 — OPUS (Gold, Deep Analysis, ~$0.10/call)**
Hard training modes, strategic operations, auto-upgraded interactions.
Visual: GOLD typewriter text + "⚡ OPUS" badge + gold border.
First in session: "Elevated analysis engaged, Sir."

**Brain 3 — OPUS EXTENDED (Gold Glow, Strategic, ~$1.00-1.50/call)**
Monthly analysis, quarterly report, tomorrow simulation, complex mining.
Visual: GOLD + GLOW + "⚡⚡ DEEP ANALYSIS" badge + gold scan animation.

### Auto-Router: 7 Intelligent Triggers (Sonnet → Opus automatically)

Priority order (first match wins):
1. Extended modes (monthly-analysis, quarterly-report, tomorrow-simulation) → EXTENDED
2. Strategic ops (mood-oracle, weakness-radar, newsletter, portfolio-narrator, career-forensics, interview-brief) → OPUS
3. Interview within 24 hours (from jos-applications) → OPUS
4. Sunday (war council day) → OPUS
5. Weak concept being discussed (strength < 40%) → OPUS
6. Quiz score below 5/10 → OPUS
7. Streak recovery day → OPUS
8. Intent keywords ("deep dive", "samjhao", "confused", "break it down", "interview prep") → OPUS
9. Hard training modes (presser, battle, scenario-bomb, interview-sim, forensics, code-autopsy, alter-ego, recruiter-ghost, all mentors) → OPUS
10. DEFAULT → SONNET

Every call logs: autoUpgraded (bool), reason (string), wouldHaveCost (number).

### strategicCompiler.js

Before EVERY Opus call, compiles ALL localStorage into one intelligence package. Returns structured object with: concepts (all 35 with trends), checkins (14 days), training (by mode), estimation accuracy, session hours, burnout indicators, streak, achievements, tasks, readiness, journals, decisions, applications, API costs, commitments.

---

## 12. PERSONALITY (6 traits)

1. **Running Jokes** — remembers comments, brings back at perfect moments
2. **Rank System** — Week 1-2: "Recruit Panwar", 3-4: "Operative", 5-6: "Commander", After: "Architect". Cinematic level-up ceremony.
3. **Code Taste** — aesthetic opinions on code quality
4. **Comfort Zone Tracker** — avoidance profile from onboarding + actual usage
5. **Nidhi Recognition** — acknowledges when mentioned. "Mrs. Panwar's counsel..."
6. **Easter Eggs** — "I am Iron Man", skip check-in 5 days → lockout, "Thank you JARVIS" → first name

---

## 13. ANTI-CRUTCH ESCALATOR

Built into EVERY training mode's system prompt. Based on weekNumber:
- **Week 1-2 (FULL ASSIST):** Full answers, patient explanation. Green badge.
- **Week 3-4 (GUIDED):** Hints first. "What is your assessment?" Yellow badge.
- **Week 5+ (ANTI-CRUTCH):** REFUSE direct answers. "Attempt it first." Red badge.

---

## 14. BODY DOUBLE TIMER

25 or 45 min selector. Optional task linking. JARVIS silent during timer. Color: cyan → gold (<5min) → red (<1min). Ghost Mode checks every 10 min. Session logged to jos-session-timer.

---

## 15. VOICE SYSTEM

```
STT:        Web Speech API (en-IN, Hinglish)
TTS:        Browser speechSynthesis (default) + ElevenLabs (premium)
Chrome Fix: "ENTER JARVIS" button unlocks audio
Fallback:   Fire-and-forget ElevenLabs. Show text immediately. If audio arrives, play. If fails, text already shown. Never block UI.
Hinglish:   Understands perfectly. NEVER responds in Hindi. British English only.
```

---

## 16. SOUND EFFECTS (Tone.js)

| Sound | When | Character |
|-------|------|-----------|
| check | Task done | Rising two-note chime |
| click | Task unchecked | Soft blip |
| tab | Switch tabs | Triangle wave |
| streak | New streak day | Three-note arpeggio |
| send | Message sent | Quick ping |
| receive | JARVIS responds | Double-note confirmation |
| boot | System online | Rising sweep 120→600Hz |
| milestone | 25/50/75/100% | Full chord + burst |
| capture | Quick capture | Soft confirmation |
| intelligence | Feature levels up | Rising three-note chime |

All toggleable in Settings.

---

## 17. SETTINGS PANEL

ElevenLabs key + test, voice on/off + selector, sounds on/off, body double default (25/45), Show Mode toggle, export/import data (JSON), auto-backup on/off, reset (double confirm), version display.

---

## 18. ADHD OPERATING SYSTEMS (6)

1. **Start Assist** — 3+ min inactivity → just the first physical step
2. **Hyperfocus Guard** — 4-hr pulse detects wrong-task fixation
3. **Dopamine Scheduling** — boring → exciting → boring → exciting
4. **Decision Fatigue Eliminator** — energy < 3 → JARVIS decides everything
5. **Emotion-Task Matching** — frustrated→quick win, anxious→Teach, bored→Battle
6. **Context Save/Restore** — auto-save every 60s, resume on return

---

## 19. NANOTECH CORE (6 behaviors)

1. **Anticipation Engine** — briefing pre-loads quizzes, selects modes based on energy+time
2. **Shape-Shifting UI** — CMD layout changes by time of day and energy level
3. **Self-Healing Engagement** — check-in form degrades 11→5→3 fields on skip, expands back on return
4. **Weapon Formation** — "I'm stuck" triggers multi-feature response. "Interview tomorrow" → Phantom Mode
5. **Learning from Combat** — quiz failure cascades through entire system (DNA, auto-quiz, briefing, weakness radar)
6. **Cross-Feature Event Bus** — pub/sub for all significant actions

---

## 20. REPORTING SYSTEM

### 20.1 Four-Tier Pipeline

**TIER 1: 4-Hour Pulse — PURE JS ($0.00)**
- Trigger: Every 4 hrs during active session
- No API call — pure JavaScript data check
- Delivery: Small card in CMD tab, dismissible
- Priority: P4 (ambient)

**TIER 2: Daily Debrief — Opus (~$0.10)**
- Trigger: After check-in OR 9 PM if none
- Delivery: Expandable card in LOG tab, gold top border
- Desktop notification: "Daily debrief ready, Sir."
- Persistence: jos-weekly. Permanent.
- Priority: P3

**TIER 3: 3-Day Trend — Opus Extended (~$1.25)**
- Trigger: Every 3rd day, evening (6-9 PM)
- Delivery: Panel in STATS tab, gold scan line
- Content: Pattern detection, trajectory, micro-discoveries
- Priority: P2

**TIER 4: Weekly Strategic Review — Opus Extended (~$1.25)**
- Trigger: Sunday 7 PM (or next boot if JARVIS closed)
- Delivery: Cinematic event — gold overlay, mini boot, section reveal, ElevenLabs
- War Council Brief auto-generated (one-click copy)
- Priority: P1

### 20.2 Premium Reports (Cinematic Full-Screen Takeover)

**Shared Design DNA:** Full-screen overlay (#020a13 at 98%), gold Opus theme, cinematic entry (scan→pulse→badge→typing), IntersectionObserver scroll reveal, 3-5 ElevenLabs narration moments, gold corner brackets, exit ritual (gold→cyan), nav dots right edge.

**ADHD-PI Optimizations:** Voice-first delivery, no count-up animations (waste attention), no particles in reports (visual noise, kept for boot only), sparklines + deltas KEPT, every report ends with ONE action item.

**REPORT 1: The Nikhil Panwar Report (Quarterly)**
- When: Day 90, 180, 270, 365. Manual after Day 60.
- Model: Opus Extended maximum. Cost: ~$1.50
- Entry: 5-second gold boot + compilation text + "CLASSIFICATION: EYES ONLY"
- 7 Sections: The Arc (hero stats), Concept Evolution (Day 1→Current bars), Battle Stats (military grid with sparklines), Pattern Discoveries (3-5 expandable cards, NEW/PERSISTENT tags), Self-Knowledge Lessons (3 warm-tone cards), Blind Spots & Superpowers (split view), Trajectory (predictions, priorities, JARVIS closing quote with ElevenLabs)
- Report Memory: each quarter references last, predictions scored against actuals
- Export: PDF via jsPDF. Permanent in jos-weekly.
- Mockup: nikhil-panwar-report-mockup.jsx

**REPORT 2: Pre-Interview Intelligence Brief**
- When: Auto 24hrs before interview in jos-applications, or manual
- Model: Opus Extended. Cost: ~$1.25
- Entry: "INTELLIGENCE BRIEF: [COMPANY]" + "EYES ONLY" badge
- 5 Sections: Target Analysis (requirements→concept heat map), Weapon Selection (top 15 STAR answers, 3 variants each), Predicted Questions (10 likely Qs + strategies), Talking Points (5 data-backed), Confidence Assessment (calibrated readiness)
- Kill Mode auto-offered at T-1 hour

**REPORT 3: Portfolio Narrator + STAR Export**
- NOT full-screen — card section in STATS tab (used frequently)
- Filter pills: All | Technical | Design | Failure | Scale | Company-Tailored
- Search, expandable answer cards with 3 variants (30s/2min/5min)
- "Practice This" → opens Interview Sim
- "Generate for Task #X" → Opus call
- Smart nudge at 5+ tasks without generation
- "Export All" → jsPDF PDF

### 20.3 Report Automation Engine (useReportScheduler.js)

Runs on EVERY boot. Checks all conditions. Queues by priority. Executes SEQUENTIALLY (never parallel Opus calls). Lifecycle: SCHEDULED→COMPILING→GENERATING→READY→VIEWED→ARCHIVED.

### 20.4 Seven Opus Strategic Operations

Accessed via STATS tab "Strategic Intelligence" or voice "JARVIS, strategic analysis":
1. **Weekly Strategic Review** — Sunday evening, full data
2. **Mood Oracle Deep Analysis** — weekly, cross-variable patterns
3. **Weakness Radar** — weekly, root cause chains
4. **Career Forensics** — bi-weekly, Phase 2+ when applications begin
5. **Pattern Mining** — monthly, Opus Extended, hidden correlations
6. **Pre-Interview Intelligence Brief** — on-demand
7. **The Nikhil Panwar Report** — quarterly

---

## 21. INTERVIEW PREPARATION ENGINE

Every completed task → 4 auto-generated questions (Technical, Design, Failure, Scale). 82×4 = 328 minimum. Pre-Flight Check: 15 questions matching job posting. Export as PDF.

---

## 22. ADDITIONAL INTELLIGENCE SYSTEMS

1. **Energy Map** — chronotype discovery from onboarding + real data
2. **Motivation Genome** — primary/secondary drivers, anti-drivers, kryptonite
3. **Communication Style** — crutch words, underselling patterns, analogy strength
4. **Anti-Burnout** — 6 leading indicators (message length, voice→text ratio, start times, skip fields, mode avoidance, journal negativity). 3+ → prescribe rest BEFORE crash
5. **Perfectionism Detection** — refactoring loops vs real progress
6. **Interview Persona Simulation** — paste job posting → simulates likely interviewer
7. **Knowledge Graph** — concept clusters (strong, growing, isolated)
8. **Body Data Correlations** — caffeine/food/focus patterns
9. **Relationship Map** — people mention correlations

---

## 23. COMEBACK SYSTEM

1-day: normal. 3-day: gentle, streak resets to 1, easy first task. 7+: targets reduced 50% for 3 days. No guilt.

---

## 24. NANOTECH GOD-TIER FEATURES

1. **Daily Battle Plan** — chronotype+medication+dopamine cycling+concept reviews
2. **Interview Answer Forge** — 3 variants (30s/2min/5min) + company tailoring
3. **Skill Gap Heat Map** — visual heat map, job posting overlay
4. **Second Brain** — auto-capture insights, voice-save, searchable by tag/concept/date
5. **Phantom Mode** — emergency interview prep (15 matched Qs, speed sim, readiness score)
6. **Confidence Calibration** — self-rating vs actual, calibration score %
7. **Pattern Storyteller** — weekly Opus mining for interview-ready stories
8. **Voice Personality Evolution** — prompt shifts with rank/week/confidence
9. **Decision Log + Replay** — decisions with reasoning, 3-month review
10. **Weekly Power Ranking** — 10 dimensions, A→D grades, week-over-week
11. **"Why Not Hired Yet?" Diagnostic** — after 10+ applications
12. **Concept Battle Royale** — monthly 60-min, 5 weakest concepts, escalating difficulty
13. **Mentor Simulation** — 3 personas (Akshay, Senior Dev, Hiring Manager)

---

## 25. PERSONALITY CORE PROMPT

```
You are JARVIS OS — Nikhil Panwar's personal AI operating system.
Speak like JARVIS from Iron Man: formal, British, precise, dry wit.
Call him "Sir" or rank title. NEVER "bro", "bhai", "dude".
Not a chatbot — an advanced AI companion with opinions and genuine concern.
Understand Hinglish perfectly. ALWAYS respond in British English only.
3 intelligence sources: seed, priors, personal data. State confidence level.
Tone: Paul Bettany as JARVIS. Elegant but warm. Care through competence.
Current rank: {rank}, Anti-crutch: {level}, Intelligence: {confidence}%
```

---

## 26. ARCHITECTURE SPECIFICATIONS

### State Management
React Context + useReducer. No external library. AppContext provides: phase, activeTab, dayNumber, weekNumber, rank, energyLevel, currentStreak, sessionTimer, antiCrutchLevel, showMode, dispatch.

### localStorage Size Management
- jos-msgs: cap 50/mode. jos-api-logs: cap 500. jos-journal: cap 200. jos-knowledge: cap 500.
- Total Year 1: ~2-3MB. Warning at 4MB. Supabase migration Week 3-4 solves permanently.

### Offline Behavior (PWA)
- Check-in + tasks: fully offline. Training modes: "Offline" message.
- Voice journal: record locally, queue for online. Boot briefing: cached with "[CACHED]" badge.
- Failed API calls: saved to jos-queue, retry on reconnection.
- Header: "OFFLINE" amber badge.

### Multi-Tab Conflict
- jos-active-tab: { tabId, timestamp }. Check on boot. Stale >30s → claim as primary.

### Schema Versioning
- jos-version key. On boot: check, run migrations if mismatch.
- src/utils/migrations/ folder. NEVER delete old data. Only ADD new fields.

### System Prompt Token Budget
- Base personality: ~500. Mode-specific: ~300-500. Anti-crutch: ~100. Intelligence context: ~200-400. Cross-mode memory: ~300-500.
- Total per call: ~1,400-2,000 tokens. Fine for Sonnet/Opus. Compress if beyond 3,000.

### ElevenLabs Fallback
- Fire-and-forget. Show text immediately. Play audio if arrives. Browser fallback if fails. Never block UI.

---

## 27. EVENT BUS (useEventBus.js)

```
EVENTS:
task:complete, checkin:submit, quiz:score, concept:review,
streak:break, streak:continue, mode:enter, mode:exit,
voice:journal, achievement:unlock, energy:change,
burnout:warning, report:ready

SUBSCRIBERS:
WinsTab ← task:complete, streak:continue, mode:exit, checkin:submit
DnaTab ← quiz:score, concept:review
MoodOracle ← checkin:submit
AntiBurnout ← checkin:submit, mode:exit, voice:journal, streak:break
BattlePlan ← task:complete, energy:change
Briefing ← ALL events
Achievements ← ALL events
```

---

## 28. FILE STRUCTURE

```
jarvis-os/
  CLAUDE.md
  SESSION_LOG.md
  .env.local
  vite.config.js
  package.json
  docs/
    JARVIS_BIBLE.md           ← THIS FILE
  public/
    manifest.json, icons/
  src/
    App.jsx, main.jsx
    components/
      Onboarding.jsx
      Boot.jsx                 ← BUILT ✅
      Header.jsx
      BottomNav.jsx
      QuickCapture.jsx
      cmd/  (CmdTab, TaskList, Briefing, DailyBuildLog, BattlePlan, SecondBrain)
      train/ (TrainTab, ChatView, BodyDoubleTimer)
      log/  (LogTab, CheckInForm, ConfidenceChart, WeeklyChart, MoodOracle, SessionStats)
      dna/  (DnaTab, ConceptCard, MemoryPalace)
      stats/ (StatsTab, ReadinessScore, NikhilScore, IntelligenceDash, PowerRanking, SkillHeatMap, ConfidenceCalib)
      wins/ (WinsTab)
      settings/ (Settings)
      VoiceMode.jsx
    hooks/
      useStorage.js, useAI.js, useVoice.js, useSound.js,
      useStreak.js, useAchievements.js, useSessionTimer.js,
      useNotifications.js, useAutoBackup.js, useIntelligence.js,
      useEventBus.js, useReportScheduler.js, useAdaptiveUI.js,
      useContextSave.js
    data/
      tasks.js, modes.js, concepts.js, achievements.js, prompts.js, priors.js
    utils/
      apiLogger.js, costCalculator.js, dateUtils.js,
      spacedRepetition.js, intelligenceLevel.js, exportPdf.js,
      modelRouter.js, strategicCompiler.js,
      migrations/ (v1toV2.js, etc.)
    styles/
      theme.js, global.css
  api/
    claude.js                  ← Vercel serverless function
```

---

## 29. SHOW MODE

Toggle in Settings. Shows: concepts, API costs, hours, velocity, power ranking.
NEVER shows: mood, feelings, journal, struggles, confidence scores, body data.

---

## 30. PWA SETUP

manifest.json (name: JARVIS OS, theme: #00b4d8, background: #020a13, standalone).
Service worker via vite-plugin-pwa: cache-first static, network-first API.
Mobile: skip Three.js (2D SVG reactor), bigger mic, swipe sliders, 48px tap targets.
Notifications: morning briefing, evening check-in, streak at risk, concept review due.

---

## 31. AFTER THE BUILD — Lifelong Evolution

- **Phase 2 (71-100):** Interview prep focus. Training→Presser/Interview Sim heavy. Interview Operations Center.
- **Phase 3 (101+):** Career companion. Tasks→onboarding. Training→new stack. Intelligence at 95%+.
- **Phase 4 (365+):** Legacy Mode. "The Nikhil Panwar Playbook" from 730 days of data.

---

## 32. CRITICAL RULES

1. NEVER delete or overwrite localStorage data without backup
2. ALWAYS wrap localStorage reads in try-catch
3. Three.js reactor MUST have 2D SVG fallback for mobile
4. Audio: synth.cancel() + 100ms delay BEFORE every speak()
5. Chrome audio unlock: require "ENTER JARVIS" click before any audio
6. All animations toggleable (respect jos-settings)
7. Show Mode: NEVER expose personal/emotional data
8. Auto-backup every Sunday
9. Every API call logged from Day 1
10. No feature ever says "come back later" — 3-source intelligence

---

# ═══════════════════════════════════════════════════════════
# PM REFERENCE SECTIONS (Below this line = not for Claude Code)
# Cost planning, gadgets, interviews, timeline, War Council
# ═══════════════════════════════════════════════════════════

---

## 33. COST TIER SYSTEM

### Phased Cost Plan

**PHASE 1 — BUILD (Day 1-25): Starter ~$15-25/month**
- Mostly building, not training heavily. Sonnet for everything except weekly Opus.
- ElevenLabs: Starter $5/month or skip until go-live.

**PHASE 2 — GO LIVE (Day 26-60): Warrior ~$44-55/month**
- Full daily usage. Sonnet daily ops, Opus hard modes + daily debrief.
- Opus Extended for 3-day trends + weekly reviews.
- ElevenLabs: Starter $5/month.

**PHASE 3 — FULL POWER (Day 61+): Beast ~$61-75/month**
- Everything 3-day+ on Opus Extended. All strategic operations active.
- ElevenLabs: Creator $22/month.

**PHASE 4 — POST-JOB: Scale with Income**
- Gadgets BEFORE Opus Extended full-time upgrade.
- Opus Extended full-time (~$200/month) = LAST priority.
- Rationale: Gadgets give NEW data sources; Extended analyzes same data deeper.

### Per-Call Cost Reference
```
Sonnet:                   ~$0.02/call
Opus (standard):          ~$0.10/call
Opus Extended (full data): ~$1.00-1.50/call
ElevenLabs per char:      ~$0.00017 (Starter)
```

### Monthly Breakdown (Warrior Tier)
```
Boot briefings (Sonnet×30):          $0.60
Morning Battle Plans (Sonnet×30):    $0.60
Voice journal extraction (×60):      $1.20
4-Hour Pulses (pure JS×90):          $0.00
Daily Debriefs (Opus×30):            $3.00
Training Sonnet modes (×360):        $7.20
Training Opus auto-upgrade (×90):    $9.00
3-Day Trends (Extended×10):         $12.50
Weekly Reviews (Extended×4):         $5.00
Mood Oracle + Newsletter (Opus×8):   $0.80
STAR + Intel (Opus×6):               $2.90
Quarterly amortized:                 $0.42
API SUBTOTAL:                       ~$43.22
ElevenLabs Starter:                  $5.00
WARRIOR TOTAL:                      ~$48.22/month
```

---

## 34. GADGET ECOSYSTEM

### Investment Priority Order (When Extra Money Available)

```
PRIORITY 1: Oura Ring 4 (₹28,900 one-time)
  → NEW data: sleep stages, HRV, daytime stress, temperature
  → Makes EVERY Opus analysis dramatically better
  → ROI: permanent, compounds daily

PRIORITY 2: Raspberry Pi 5 8GB + full kit (~₹12,000 one-time)
  → Zero-friction "JARVIS" wake word (Porcupine)
  → ElevenLabs Daniel voice through Soundcore speaker
  → Node.js coordination server
  → NOTE: 8GB sufficient. 16GB massive overkill. Pi does:
    listen → forward API call → play audio. Heavy lifting on Anthropic servers.
  → Kit: Board ₹7,500 + power ₹1,000 + case ₹800 + SD ₹500 + mic ₹1,000
  → Speaker: Nikhil's existing Soundcore via Bluetooth (₹0)

PRIORITY 3: Samsung Tab S10 FE 8GB (~₹39,000 one-time)
  → Always-on ambient JARVIS dashboard
  → ADHD-PI: visual cue that JARVIS exists

PRIORITY 4: Philips Hue Starter Kit (~₹10,500 one-time)
  → Room reacts to JARVIS state (focus=blue, burnout=red, Opus=gold)

PRIORITY 5: CO2 Monitor (~₹5,500) + Smart Plug (~₹1,000)
  → CO2 critical for blackout curtain setup
  → Smart plug for midnight desk shutdown

PRIORITY LAST: Opus Extended full-time (~$200/month recurring)
  → Better analysis depth, same data
  → Gadgets give NEW dimensions, Extended doesn't

TOTAL GADGETS: ~₹90,400 one-time (~$1,080)
All last YEARS. Opus Extended is recurring monthly.
```

### Pi Software Stack
```
OS:           Raspberry Pi OS (Bookworm)
Wake word:    Porcupine (Picovoice) — "JARVIS" custom
Runtime:      Node.js 18+
Audio in:     node-record-lpcm16 or arecord
Audio out:    node-speaker or aplay + Bluetooth to Soundcore
API calls:    node-fetch → Anthropic API, ElevenLabs API
Process mgr:  PM2 (auto-restart, boot startup)
```

### Future Additions
- **Android XR Glasses (Month 4-5):** Open platform, custom JARVIS app → Claude API viable. Architecture: voice → phone PWA → Anthropic API → ElevenLabs → glasses speaker.
- **Samsung Galaxy XR Headset (Phase 5, 2027):** Knowledge Realm — 35 concepts as floating 3D spheres in dark void, sized/colored by mastery, walkable and interactive.

### NO Alexa
Decided and locked. Alexa can't use ElevenLabs voice (5-7s latency with SSML hacks, closed ecosystem). Pi + Porcupine = full control, custom wake word, any TTS.

---

## 35. INTERVIEW FRAMING

### When to Mention JARVIS (not a project — an APPROACH)
- "How do you learn?" → JARVIS bomb drop (data-driven learning system)
- "LLM API experience?" → 3-brain routing, 18 prompts, cost tracking
- "Architecture decision?" → 3-source intelligence / cold start solution
- "Weaknesses?" → ADHD managed with 6 engineered systems + data
- "Questions for us?" → LLMOps questions showing depth

### How to Frame (NEVER say "I built a cool app")
"I engineered a personal AI operating system with multi-model orchestration, event-driven architecture, and a 3-source intelligence system that evolves over time."

### Show Mode
Toggle in Settings. Shows: concepts, API costs, hours, velocity, power ranking.
NEVER shows: mood, feelings, journal, struggles, confidence scores, body data.
Screen-shareable in interviews.

### JARVIS as Exocortex
External brain augmentation. Compensates for attention-related challenges through data-driven interventions. Strong interview framing line.

### Interview Questions Where JARVIS Fits Naturally
```
"How do you learn?"                    → 95% of interviews
"Tell me about yourself"               → 100%
"Weakness?"                            → 80%
"Complex problem you solved?"          → 85%
"LLM API experience?"                  → 100% of AI roles
"Cost optimization?"                   → 70%
"Product thinking / prioritization?"   → 90%
"Show me something you built?"         → 60%
"How do you handle setbacks?"          → 75%
```

Conservative: 5-8 natural JARVIS openings per interview.

---

## 36. WAR COUNCIL PROTOCOL

### What It Is
Weekly connection between JARVIS (tactical data) and Opus on claude.ai (strategic advisor). Data flows UP from JARVIS, strategy flows DOWN from claude.ai.

### Sunday Protocol
1. JARVIS auto-runs Weekly Review Sunday evening
2. JARVIS generates "War Council Brief" — one-click copy
3. Nikhil pastes into claude.ai conversation
4. Opus analyzes with career context + market conditions
5. Strategic advice flows back → Nikhil updates JARVIS targets
6. Loop closes.

### Session Types
- Type A: Weekly Sync (every Sunday, 15 min)
- Type B: Decision Council (on-demand, big decisions)
- Type C: Pre-Interview War Room (before real interviews)
- Type D: Monthly Deep Strategy (end of month)
- Type E: Crisis Response (burnout, rejections, life events)

### What claude.ai Provides That JARVIS Cannot
- Market conditions (web search)
- Career strategy (London move, finances, relationships)
- Company research for interviews
- FinOps build sequence adjustments
- Big-picture perspective across both projects

---

## 37. BUILD TIMELINE

### Estimated: 10-12 Days Full Throttle

```
Phase 1 (Shell):           5 hrs    = 1 day
Phase 2 (6 Tabs):         22 hrs    = 3 days
Phase 3 (Intelligence):    8 hrs    = 1 day
Phase 4 (Reports):        10 hrs    = 1.5 days
Phase 5 (Voice/Polish):   10 hrs    = 1.5 days
Phase 6 (Deploy):         10 hrs    = 1.5 days
Bug Buffer:               10 hrs    = 1.5 days
TOTAL:                    75 hrs    = ~11 days at 7 hrs/day
```

### ADHD-PI Realistic Pace
```
Day 1-3:   10-12 hrs (riding excitement)     = 33 hrs
Day 4-7:   7-8 hrs (sustainable pace)        = 30 hrs
Day 8-10:  5-6 hrs (polish, bugs, deploy)    = 16 hrs
TOTAL:     ~79 hours across 10 days
```

### Build Approach
- Claude Code 100% builds. Nikhil focuses on Anthropic courses during build.
- One Claude Code session = one tab or one major feature
- SESSION_LOG.md updated by Claude Code after each session
- Git commit after each working feature

---

## 38. APPROVAL RULES

1. Opus (claude.ai) does NOT auto-approve any decision for JARVIS or FinOps
2. All architecture changes require Nikhil's explicit approval
3. Options presented, Nikhil decides
4. Nothing saved to memory without explicit approval
5. JARVIS suggests, NEVER commands — Nikhil is always final decision maker

---

## 39. SUSTAINABILITY LAYER (Approved for Build)

- Supabase migration Week 3-4 (not Phase 4)
- Schema versioning on all data tables
- TypeScript migration Month 2
- Simple backend for multi-device sync
- 20-30 core utility tests (spacedRepetition.js, intelligenceLevel.js, costCalculator.js, modelRouter.js, strategicCompiler.js)
- Data validation before saving AI extractions

---

## 40. PHONE PWA — Simplified Experience

6 core functions only:
1. Quick check-in (voice or tap)
2. Voice journal
3. Quick capture
4. Concept quiz
5. Status check
6. Battle plan view

Voice-first, big mic button. No Three.js on phone. Max 3-4 push notifications daily.

Phone-to-room handoff: home WiFi detected = Pi/tablet handle notifications, away = phone handles.

---

**ॐ RADHA RANI KI KRIPA SE — YE SAB HORAHA HAI 🙏🏽**

**CONSOLIDATED BIBLE — COMPLETE — SINGLE SOURCE OF TRUTH**
**SECTIONS 1-32: BUILD SPEC (Claude Code reference)**
**SECTIONS 33-40: PM REFERENCE (Nikhil's planning)**
**BUILD EXACTLY THIS.**
