// achievements.js — 18 Achievements with unlock conditions
// WHY: Achievements are dopamine hits — they celebrate real progress, not vanity.
// Each achievement has a check() function that receives the full app state
// and returns true when the condition is met. The WINS tab and event bus
// call these checks after every significant action.

const ACHIEVEMENTS = [
  {
    id: 'first-blood',
    name: 'First Blood',
    emoji: '🩸',
    description: 'Complete your first task',
    check: (state) => state.tasksCompleted >= 1,
  },
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    emoji: '⚔️',
    description: 'Complete all tasks in any single week',
    check: (state) => state.weekFullyCompleted,
  },
  {
    id: 'streak-starter',
    name: 'Streak Starter',
    emoji: '🔥',
    description: 'Maintain a 3-day streak',
    check: (state) => state.streak >= 3,
  },
  {
    id: 'week-streak',
    name: 'Week Streak',
    emoji: '💎',
    description: 'Maintain a 7-day streak',
    check: (state) => state.streak >= 7,
  },
  {
    id: 'fortnight',
    name: 'Fortnight',
    emoji: '👑',
    description: 'Maintain a 14-day streak',
    check: (state) => state.streak >= 14,
  },
  {
    id: 'motormouth',
    name: 'Motormouth',
    emoji: '💬',
    description: 'Send 100+ messages across all modes',
    check: (state) => state.totalMessages >= 100,
  },
  {
    id: 'chatterbox',
    name: 'Chatterbox',
    emoji: '🗣️',
    description: 'Send 500+ messages across all modes',
    check: (state) => state.totalMessages >= 500,
  },
  {
    id: 'concept-collector',
    name: 'Concept Collector',
    emoji: '🧩',
    description: 'Get 5 concepts to 60%+ strength',
    check: (state) => state.conceptsAbove60 >= 5,
  },
  {
    id: 'knowledge-base',
    name: 'Knowledge Base',
    emoji: '📚',
    description: 'Get 15 concepts to 60%+ strength',
    check: (state) => state.conceptsAbove60 >= 15,
  },
  {
    id: 'brain-full',
    name: 'Brain Full',
    emoji: '🧠',
    description: 'Get all 35 concepts to 60%+ strength',
    check: (state) => state.conceptsAbove60 >= 35,
  },
  {
    id: 'self-aware',
    name: 'Self-Aware',
    emoji: '🪞',
    description: 'Complete 7 daily check-ins',
    check: (state) => state.totalCheckIns >= 7,
  },
  {
    id: 'data-driven',
    name: 'Data Driven',
    emoji: '📊',
    description: 'Complete 21 daily check-ins',
    check: (state) => state.totalCheckIns >= 21,
  },
  {
    id: 'halfway',
    name: 'Halfway',
    emoji: '🏔️',
    description: 'Complete 50% of all tasks',
    check: (state) => state.tasksCompleted >= 41,
  },
  {
    id: 'finisher',
    name: 'Finisher',
    emoji: '🏆',
    description: 'Complete all 82 tasks',
    check: (state) => state.tasksCompleted >= 82,
  },
  {
    id: 'battle-tested',
    name: 'Battle Tested',
    emoji: '⚔️',
    description: 'Send 10+ messages in Battle mode',
    check: (state) => state.battleMessages >= 10,
  },
  {
    id: 'code-surgeon',
    name: 'Code Surgeon',
    emoji: '🩻',
    description: 'Complete 5+ Code Autopsy sessions',
    check: (state) => state.codeAutopsySessions >= 5,
  },
  {
    id: 'bomb-survivor',
    name: 'Bomb Survivor',
    emoji: '💣',
    description: 'Survive 5+ Scenario Bomb sessions',
    check: (state) => state.scenarioBombSessions >= 5,
  },
  {
    id: 'time-traveler',
    name: 'Time Traveler',
    emoji: '⏳',
    description: 'Create 3+ Time Machine capsules',
    check: (state) => state.timeCapsules >= 3,
  },
]

export default ACHIEVEMENTS
