# CLAUDE.md — JARVIS OS Build Rules

## What Is This Project

JARVIS OS is Nikhil Panwar's personal AI operating system — a standalone React app inspired by Iron Man's JARVIS. ~162 features across 6 tabs, 18 training modes, 9+ intelligence systems, nanotech adaptive behaviors. Built with Claude Code (90%), reviewed by Nikhil (10%). Lifelong companion, minimum 2 years of daily use.

## Tech Stack

- React 18 + Vite + Tailwind CSS
- Three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing (3D reactor)
- Framer Motion (layout animations) + @react-spring/web (physics values)
- Tone.js (spatial audio, synths, ambient) + Web Audio API (waveform)
- Web Speech API (STT, en-IN, Hinglish) + Browser speechSynthesis (default TTS) + ElevenLabs API (premium TTS)
- Anthropic API (smart routing: Sonnet 92%, Opus 6%, Opus Extended 2%)
- Recharts (charts), Lucide React (icons), react-circular-progressbar (gauges)
- jsPDF (PDF export), date-fns (dates/streaks)
- localStorage (ALL data storage — 25+ keys, NOT window.storage)
- Vercel (deploy) + vite-plugin-pwa (PWA)

## Design System — Iron Man 2050

- Background: #020a13 (deep navy void)
- Card: #061422, Border: #0d2137
- Accent Primary: #00b4d8 (ice cyan — JARVIS signature)
- Cyan Neon: #00f0ff (active states, scan lines)
- Gold: #d4a853 (arc reactor warm accent)
- Text: #d0e8f8 (light cyan-white), Dim: #5a7a94, Muted: #2a4a60
- Fonts: Rajdhani (display), Exo 2 (body), Share Tech Mono (mono/data)
- Corner brackets [ ] on key panels (CSS ::before/::after)
- Hex grid background at 1.5% opacity
- Scan line sweep on transitions
- Holographic shimmer on hover
- Breathing animations (3s ease infinite) on reactor, status dots, percentages

## Code Conventions

- Functional components only (no class components)
- Hooks for ALL logic (useStorage, useAI, useVoice, useSound, useIntelligence, useEventBus, etc.)
- Tailwind for styling (use theme colors from tailwind.config.js)
- Lucide React for ALL icons (monoline, themed)
- localStorage keys prefixed with `jos-` (e.g., jos-core, jos-feelings, jos-concepts)
- JSON.parse wrapped in try-catch EVERYWHERE (localStorage corruption protection)
- API calls ALWAYS logged to jos-api-logs via apiLogger.js
- Every component file has a comment header: // ComponentName.jsx — [brief description]
- No TypeScript (JavaScript only for this project)
- Single file components where possible (keep it simple)
- Framer Motion for layout animations, React Spring for continuous values

## API Rules

- ALWAYS use model router: getModel(mode) → returns correct model
- Sonnet for: all 18 training modes, briefing, voice conversation, milestone speeches, reports T1-T2
- Opus for: Mood Oracle, Weakness Radar, Newsletter, Portfolio Narrator, Onboarding analysis, reports T3
- Opus Extended for: Monthly full analysis, Comfort Zone deep, Decision Replay, reports T4
- ALWAYS inject 3-source intelligence context into system prompts
- ALWAYS log every API call (model, mode, tokens, latency, cost, promptVersion)
- DEMO_MODE flag: when true, return mock responses instead of real API calls
- Streaming (SSE) for all real-time responses
- System prompts include: JARVIS personality, anti-crutch level, rank, intelligence confidence, relevant cross-mode data

## JARVIS Personality (for system prompts)

- Speaks like Paul Bettany's JARVIS: formal, British, precise, dry wit
- Calls user "Sir" or rank title (Recruit/Operative/Commander/Architect)
- NEVER "bro", "bhai", "dude", casual slang
- Understands Hinglish perfectly, ALWAYS responds in British English only
- Has OPINIONS — not a passive chatbot
- Anti-crutch escalation: Week 1-2 full assist, Week 3-4 guided, Week 5+ refuses direct answers
- Confidence language: "Based on ADHD research..." (early) → "Based on your data..." (calibrated)

## localStorage Keys (25+)

jos-onboarding, jos-core, jos-feelings, jos-concepts, jos-msgs-{mode}, jos-achievements,
jos-journal, jos-api-logs, jos-settings, jos-weekly, jos-interviews, jos-commitments,
jos-morning-bets, jos-session-timer, jos-quick-capture, jos-daily-build, jos-backup,
jos-knowledge, jos-decisions, jos-applications, jos-battle-plan

## File Structure

See Bible v5.2 Section 29 for complete file tree. Key directories:

- src/components/ — all UI components organized by tab
- src/hooks/ — all custom hooks (useStorage, useAI, useVoice, useSound, useIntelligence, useEventBus, useAdaptiveUI, etc.)
- src/data/ — static data (tasks.js, modes.js, concepts.js, achievements.js, prompts.js, priors.js)
- src/utils/ — utility functions (apiLogger, costCalculator, dateUtils, spacedRepetition, intelligenceLevel, exportPdf)
- src/styles/ — theme.js + global.css
- api/ — Vercel serverless function (claude.js)

## Event Bus Events

task:complete, checkin:submit, quiz:score, concept:review, streak:break, mode:enter, voice:journal
Every significant action fires an event. Components subscribe to relevant events independently.

## Critical Rules

1. NEVER delete or overwrite existing localStorage data without backup
2. ALWAYS wrap localStorage reads in try-catch
3. Three.js reactor MUST have fallback (2D SVG) for mobile
4. Audio: synth.cancel() + 100ms delay BEFORE every speak() call
5. Chrome audio unlock: require user click ("ENTER JARVIS") before any audio
6. ElevenLabs for cinematic moments ONLY (boot, milestones, rank-up, newsletter, shutdown)
7. Browser speechSynthesis for regular chat responses
8. All animations must be toggleable (respect jos-settings)
9. Show Mode: NEVER expose mood, feelings, journal, struggles, confidence scores, body data
10. Auto-backup every Sunday to jos-backup (full localStorage snapshot)

## WHY Breakdown (for Nikhil's learning)

Every prompt to Claude Code should explain WHY decisions are made. Nikhil is learning through this build.

- Why this model for this mode?
- Why this data structure?
- Why this animation approach?
- Why this error handling pattern?
  This is NOT optional — it's how the builder learns.

## Reference Documents

Full specification: docs/JARVIS_BIBLE.md
Read relevant Bible section before building any feature.
