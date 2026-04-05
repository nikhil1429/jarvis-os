// microCelebrations.js — Frequent small dopamine hits throughout the day
// WHY: ADHD brains need FREQUENT rewards. Big milestones are too rare.
// Small wins (first task, concept exits red zone, 1-hour mark) keep momentum.
// Each celebration: message + sound + optional voice.

/**
 * Check if a micro-celebration should fire for the given trigger.
 * @param {string} trigger — event type
 * @param {Object} ctx — context data
 * @returns {{ message, sound, speak }|null}
 */
export function checkMicroCelebration(trigger, ctx) {
  const celebrations = MICRO_CELEBRATIONS.filter(mc => {
    if (mc.trigger !== trigger) return false
    try { return mc.condition(ctx) } catch { return false }
  })
  // Return the last matching (highest specificity)
  return celebrations.length > 0 ? formatCelebration(celebrations[celebrations.length - 1], ctx) : null
}

function formatCelebration(mc, ctx) {
  return {
    message: typeof mc.message === 'function' ? mc.message(ctx) : mc.message,
    sound: mc.sound || 'check',
    speak: mc.speak || false,
  }
}

const MICRO_CELEBRATIONS = [
  // === TASK COMPLETIONS ===
  {
    trigger: 'task:complete',
    condition: (ctx) => ctx.tasksToday === 1,
    message: 'First task of the day. Momentum started.',
    sound: 'check',
  },
  {
    trigger: 'task:complete',
    condition: (ctx) => ctx.tasksToday === 3,
    message: "Three down. You're in the zone, Sir.",
    sound: 'streak',
  },
  {
    trigger: 'task:complete',
    condition: (ctx) => ctx.tasksToday >= 5,
    message: 'Five tasks. That is a high-output day.',
    sound: 'milestone',
    speak: true,
  },
  {
    trigger: 'task:complete',
    condition: (ctx) => ctx.totalCompleted > 0 && ctx.totalCompleted % 10 === 0,
    message: (ctx) => `${ctx.totalCompleted} tasks total. ${82 - ctx.totalCompleted} to go.`,
    sound: 'milestone',
    speak: true,
  },

  // === CONCEPT STRENGTH ===
  {
    trigger: 'concept:strength',
    condition: (ctx) => ctx.newStrength >= 30 && ctx.oldStrength < 30,
    message: (ctx) => `${ctx.conceptName} exits the red zone. Keep pushing.`,
    sound: 'intelligence',
  },
  {
    trigger: 'concept:strength',
    condition: (ctx) => ctx.newStrength >= 60 && ctx.oldStrength < 60,
    message: (ctx) => `${ctx.conceptName} is now competent. Interview-ready foundation.`,
    sound: 'intelligence',
    speak: true,
  },
  {
    trigger: 'concept:strength',
    condition: (ctx) => ctx.newStrength >= 80 && ctx.oldStrength < 80,
    message: (ctx) => `${ctx.conceptName} at ${ctx.newStrength}%. That is mastery territory, Sir.`,
    sound: 'milestone',
    speak: true,
  },

  // === SESSION TIME ===
  {
    trigger: 'session:time',
    condition: (ctx) => ctx.sessionMinutes >= 60 && ctx.sessionMinutes < 65,
    message: 'One hour of focused work. Well done.',
    sound: 'check',
  },
  {
    trigger: 'session:time',
    condition: (ctx) => ctx.sessionMinutes >= 120 && ctx.sessionMinutes < 125,
    message: 'Two hours deep. Consider a stretch.',
    sound: 'check',
    speak: true,
  },

  // === STREAK ===
  {
    trigger: 'streak',
    condition: (ctx) => ctx.streak === 3,
    message: 'Three days. Habit is forming.',
    sound: 'streak',
  },
  {
    trigger: 'streak',
    condition: (ctx) => ctx.streak === 5,
    message: 'Five days. Almost a full week.',
    sound: 'streak',
    speak: true,
  },

  // === QUIZ ===
  {
    trigger: 'quiz:score',
    condition: (ctx) => ctx.score >= 9 && ctx.score <= 10,
    message: 'Near perfect. Clean execution.',
    sound: 'milestone',
    speak: true,
  },
  {
    trigger: 'quiz:score',
    condition: (ctx) => ctx.improvement >= 3,
    message: (ctx) => `Score jumped by ${ctx.improvement} points. The work is paying off.`,
    sound: 'intelligence',
  },

  // === BODY DOUBLE ===
  {
    trigger: 'body-double:complete',
    condition: () => true,
    message: 'Session complete. What did you build?',
    sound: 'check',
    speak: true,
  },

  // === CHECK-IN ===
  {
    trigger: 'checkin:submit',
    condition: (ctx) => ctx.consecutiveCheckins >= 7,
    message: 'Seven consecutive check-ins. Your self-awareness data is getting powerful.',
    sound: 'intelligence',
    speak: true,
  },
  {
    trigger: 'checkin:submit',
    condition: (ctx) => ctx.consecutiveCheckins >= 3 && ctx.consecutiveCheckins < 7,
    message: 'Check-in streak building. The data gets smarter every day.',
    sound: 'check',
  },
]

/**
 * Build context for task:complete celebrations.
 */
export function buildTaskContext() {
  try {
    const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
    const completed = core.completedTasks || []
    const today = new Date().toISOString().split('T')[0]
    // Approximate today's tasks (rough — counts total, not per-day)
    const apiLogs = JSON.parse(localStorage.getItem('jos-api-logs') || '[]')
    const todayLogs = apiLogs.filter(l => l.timestamp && l.timestamp.startsWith(today))
    return {
      totalCompleted: completed.length,
      tasksToday: Math.min(todayLogs.length, completed.length), // rough proxy
    }
  } catch { return { totalCompleted: 0, tasksToday: 0 } }
}

/**
 * Build context for concept:strength celebrations.
 */
export function buildConceptContext(conceptName, oldStrength, newStrength) {
  return { conceptName, oldStrength, newStrength }
}
