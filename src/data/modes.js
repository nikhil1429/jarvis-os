// modes.js — 18 AI Training Modes
// WHY: Each mode is a different "training simulation" with its own personality,
// difficulty tier, and default AI model. Tier determines visual treatment:
// Tier 1 = Sonnet (cyan), Tier 2 = auto-upgrades to Opus sometimes (gold border),
// Tier 3 = always Opus (gold glow). This data drives the TRAIN tab grid.

const MODES = [
  { id: 'chat',           emoji: '💬', name: 'Chat',             tier: 1, model: 'sonnet', description: 'Open conversation with JARVIS — ask anything, think aloud' },
  { id: 'quiz',           emoji: '🧠', name: 'Quiz',             tier: 1, model: 'sonnet', description: 'Test your knowledge — adaptive difficulty, spaced repetition triggers' },
  { id: 'presser',        emoji: '🎤', name: 'Presser',          tier: 2, model: 'opus',   description: 'Press conference simulation — defend your decisions under pressure' },
  { id: 'timed',          emoji: '⏱️', name: 'Timed',            tier: 1, model: 'sonnet', description: 'Race the clock — answer within time limits, build speed' },
  { id: 'speed',          emoji: '⚡', name: 'Speed',            tier: 1, model: 'sonnet', description: 'Rapid-fire questions — no time to overthink, pure recall' },
  { id: 'battle',         emoji: '⚔️', name: 'Battle',           tier: 2, model: 'opus',   description: 'Adversarial debate — JARVIS argues the opposite position' },
  { id: 'teach',          emoji: '📖', name: 'Teach',            tier: 1, model: 'sonnet', description: 'Explain concepts to JARVIS — teaching reveals true understanding' },
  { id: 'body-double',    emoji: '👥', name: 'Body Double',      tier: 1, model: 'sonnet', description: 'Silent co-working with periodic check-ins (ADHD support)' },
  { id: 'alter-ego',      emoji: '🎭', name: 'Alter Ego',        tier: 2, model: 'opus',   description: 'JARVIS becomes your inner critic — confront your doubts' },
  { id: 'recruiter-ghost',emoji: '👻', name: 'Recruiter Ghost',  tier: 2, model: 'opus',   description: 'Simulated recruiter screening — realistic hiring conversations' },
  { id: 'forensics',      emoji: '🔬', name: 'Forensics',        tier: 3, model: 'opus',   description: 'Deep code analysis — line by line interrogation of your work' },
  { id: 'akshay-qs',      emoji: '💼', name: 'Akshay Qs',        tier: 1, model: 'sonnet', description: 'Domain expert mode — TDS edge cases, Hinglish, real-world scenarios' },
  { id: 'time-machine',   emoji: '⏳', name: 'Time Machine',     tier: 3, model: 'sonnet', description: 'Letters to future you — capsules sealed and revealed later' },
  { id: 'code-autopsy',   emoji: '🩻', name: 'Code Autopsy',     tier: 3, model: 'opus',   description: 'Dissect code — explain every line, track ghost rate %' },
  { id: 'scenario-bomb',  emoji: '💣', name: 'Scenario Bomb',    tier: 3, model: 'opus',   description: 'Production disasters on YOUR features — escalating severity' },
  { id: 'interview-sim',  emoji: '🔗', name: 'Interview Sim',    tier: 2, model: 'opus',   description: 'Full interview simulation with 3 mentor personas' },
  { id: 'impostor-killer',emoji: '🛡️', name: 'Impostor Killer',  tier: 1, model: 'sonnet', description: 'Combat impostor syndrome with data-driven proof of progress' },
  { id: 'weakness-radar', emoji: '📡', name: 'Weakness Radar',   tier: 3, model: 'opus',   description: 'Opus finds ROOT CAUSE of knowledge gaps — strategic operations' },
]

export default MODES
