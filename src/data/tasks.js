// tasks.js — 82 FinOps Build Tasks across 6 weeks
// WHY: These are Nikhil's actual build tasks for the JARVIS OS project.
// Each task maps to a real deliverable. Week-based grouping lets the TaskList
// component show week selector pills (W1-W6) and track progress per week.
// Structure: { id, name, week, done } — 'done' starts false, toggled by user.

const TASKS = [
  // === WEEK 1: Foundation & Setup (14 tasks) ===
  { id: 1, name: 'Set up React + Vite project', week: 1 },
  { id: 2, name: 'Configure Tailwind CSS with JARVIS theme', week: 1 },
  { id: 3, name: 'Create CLAUDE.md with all build rules', week: 1 },
  { id: 4, name: 'Design Iron Man 2050 color system', week: 1 },
  { id: 5, name: 'Build Boot sequence with reactor animation', week: 1 },
  { id: 6, name: 'Implement useStorage hook (localStorage wrapper)', week: 1 },
  { id: 7, name: 'Build Header with mini reactor + session timer', week: 1 },
  { id: 8, name: 'Build BottomNav with 6 tab icons', week: 1 },
  { id: 9, name: 'Create useSessionTimer hook (idle detection)', week: 1 },
  { id: 10, name: 'Set up hex grid background + scan lines CSS', week: 1 },
  { id: 11, name: 'Build CMD Tab layout with task list', week: 1 },
  { id: 12, name: 'Create 82 tasks data file', week: 1 },
  { id: 13, name: 'Implement useSound hook (Tone.js synths)', week: 1 },
  { id: 14, name: 'Build Quick Capture floating button', week: 1 },

  // === WEEK 2: Training & Voice (14 tasks) ===
  { id: 15, name: 'Build TRAIN tab with 18 mode cards', week: 2 },
  { id: 16, name: 'Create modes.js data (18 training modes)', week: 2 },
  { id: 17, name: 'Build ChatView with typewriter effect', week: 2 },
  { id: 18, name: 'Implement Anthropic API integration (Vercel serverless)', week: 2 },
  { id: 19, name: 'Build useVoice hook (Web Speech API STT)', week: 2 },
  { id: 20, name: 'Implement browser speechSynthesis TTS', week: 2 },
  { id: 21, name: 'Add ElevenLabs premium TTS for milestones', week: 2 },
  { id: 22, name: 'Build Body Double Timer (25/45 min)', week: 2 },
  { id: 23, name: 'Create useAI hook (API call + streaming)', week: 2 },
  { id: 24, name: 'Build per-mode message persistence', week: 2 },
  { id: 25, name: 'Implement API call logging to jos-api-logs', week: 2 },
  { id: 26, name: 'Add anti-crutch level badges to TRAIN tab', week: 2 },
  { id: 27, name: 'Build concepts.js (35 AI concepts)', week: 2 },
  { id: 28, name: 'Create system prompts with JARVIS personality', week: 2 },

  // === WEEK 3: Intelligence & Logging (14 tasks) ===
  { id: 29, name: 'Build LOG tab with check-in form', week: 3 },
  { id: 30, name: 'Create CheckInForm (14 fields + body data)', week: 3 },
  { id: 31, name: 'Build Confidence Timeline (Recharts bar chart)', week: 3 },
  { id: 32, name: 'Build Weekly Comparison Chart (line chart)', week: 3 },
  { id: 33, name: 'Implement useStreak hook (auto-increment)', week: 3 },
  { id: 34, name: 'Build Impostor Killer card (stats summary)', week: 3 },
  { id: 35, name: 'Build Nikhil vs Nikhil (week comparison)', week: 3 },
  { id: 36, name: 'Create useIntelligence hook (3-source system)', week: 3 },
  { id: 37, name: 'Build Three-Brain auto-router (7 triggers)', week: 3 },
  { id: 38, name: 'Create strategicCompiler.js (Opus context builder)', week: 3 },
  { id: 39, name: 'Add Mood Oracle (Opus weekly analysis)', week: 3 },
  { id: 40, name: 'Build Daily Build Log component', week: 3 },
  { id: 41, name: 'Implement useEventBus hook (pub/sub)', week: 3 },
  { id: 42, name: 'Add Session Timer Summary to LOG tab', week: 3 },

  // === WEEK 4: DNA & Stats (14 tasks) ===
  { id: 43, name: 'Build DNA tab with concept cards', week: 4 },
  { id: 44, name: 'Implement spaced repetition engine', week: 4 },
  { id: 45, name: 'Build concept search + category filters', week: 4 },
  { id: 46, name: 'Create expandable concept cards (notes, slider, links)', week: 4 },
  { id: 47, name: 'Build Memory Palace (CSS grid + SVG lines)', week: 4 },
  { id: 48, name: 'Build STATS tab layout', week: 4 },
  { id: 49, name: 'Create Interview Readiness Score calculator', week: 4 },
  { id: 50, name: 'Build Nikhil Score (6 dimension radar)', week: 4 },
  { id: 51, name: 'Create Intelligence Dashboard', week: 4 },
  { id: 52, name: 'Build Power Ranking (weekly grades)', week: 4 },
  { id: 53, name: 'Create Skill Heat Map (color-coded)', week: 4 },
  { id: 54, name: 'Build Confidence Calibration chart', week: 4 },
  { id: 55, name: 'Implement prerequisite warnings for concepts', week: 4 },
  { id: 56, name: 'Add amber alerts for due concepts', week: 4 },

  // === WEEK 5: Achievements & Polish (13 tasks) ===
  { id: 57, name: 'Build WINS tab with 18 achievements', week: 5 },
  { id: 58, name: 'Create achievement unlock animations (particles)', week: 5 },
  { id: 59, name: 'Build Settings panel (all toggles)', week: 5 },
  { id: 60, name: 'Implement Show Mode (hide sensitive data)', week: 5 },
  { id: 61, name: 'Add auto-backup to jos-backup (every Sunday)', week: 5 },
  { id: 62, name: 'Build export/import data (JSON)', week: 5 },
  { id: 63, name: 'Create Battle Plan generator', week: 5 },
  { id: 64, name: 'Build JARVIS Briefing card with voice', week: 5 },
  { id: 65, name: 'Implement Weakness Radar (Opus deep analysis)', week: 5 },
  { id: 66, name: 'Build Portfolio Narrator + STAR export', week: 5 },
  { id: 67, name: 'Add milestone cinematics (25/50/75/100%)', week: 5 },
  { id: 68, name: 'Build Second Brain (searchable knowledge base)', week: 5 },
  { id: 69, name: 'Create Morning Bet system', week: 5 },

  // === WEEK 6: Advanced & Nanotech (13 tasks) ===
  { id: 70, name: 'Build Three.js Arc Reactor (3D)', week: 6 },
  { id: 71, name: 'Create reactor 2D SVG fallback for mobile', week: 6 },
  { id: 72, name: 'Implement 6 ADHD Operating Systems', week: 6 },
  { id: 73, name: 'Build Nanotech adaptive behaviors', week: 6 },
  { id: 74, name: 'Create 4-tier reporting system', week: 6 },
  { id: 75, name: 'Build weekly newsletter generator', week: 6 },
  { id: 76, name: 'Implement Scenario Bomb mode', week: 6 },
  { id: 77, name: 'Build Code Autopsy mode', week: 6 },
  { id: 78, name: 'Create Time Machine capsules', week: 6 },
  { id: 79, name: 'Build Interview Sim with 3 mentor personas', week: 6 },
  { id: 80, name: 'Implement PWA (vite-plugin-pwa)', week: 6 },
  { id: 81, name: 'Deploy to Vercel', week: 6 },
  { id: 82, name: 'Final integration testing + bug fixes', week: 6 },
]

export default TASKS
