// jarvisConvictions.js — JARVIS's moral backbone
// WHY: JARVIS has POSITIONS. Things he believes strongly enough to push back on.
// Each conviction: suggest, never command. allowOverride always true.
// Based on MCU: "I'd advise against that, Sir." Then accepts override gracefully.

const HARD_MODES = ['scenario-bomb', 'code-autopsy', 'forensics', 'battle', 'presser', 'alter-ego', 'recruiter-ghost']

function safeGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

/**
 * Build context from localStorage for conviction checks.
 */
export function buildConvictionContext() {
  const now = new Date()
  const hour = now.getHours()
  const dayOfWeek = now.getDay()
  const core = safeGet('jos-core', {})
  const feelings = safeGet('jos-feelings', [])
  const lastCheckin = feelings[feelings.length - 1] || {}
  const timerData = safeGet('jos-session-timer', [])
  const today = now.toISOString().split('T')[0]
  const todayTimer = Array.isArray(timerData) ? timerData.find(t => t.date === today) : null
  const concepts = safeGet('jos-concepts', [])
  const applications = safeGet('jos-applications', [])

  // Session hours
  const sessionMinutes = todayTimer?.totalMinutes || 0
  const sessionHours = sessionMinutes / 60

  // Energy
  const energy = core.energy || 3
  const energySet = core.energy !== undefined && core.energy !== null

  // Medication state
  const onboarding = safeGet('jos-onboarding', {})
  const medHour = parseInt(onboarding.adhd?.medicationTime) || 10
  const medDuration = parseInt(onboarding.adhd?.medicationDuration) || 8
  const medState = hour >= medHour + medDuration ? 'off' : 'on'

  // Food — check last check-in
  const foodEaten = lastCheckin.food !== false
  const lastCheckinDate = lastCheckin.date ? new Date(lastCheckin.date) : null
  const daysSinceCheckin = lastCheckinDate
    ? Math.round((now - lastCheckinDate) / 86400000)
    : 999

  // Sleep
  const lastSleep = lastCheckin.sleep || 3

  // Consecutive hard modes (from session timer entries)
  let consecutiveHardModes = 0
  const sessions = todayTimer?.sessions || []
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (HARD_MODES.includes(sessions[i]?.mode)) consecutiveHardModes++
    else break
  }

  // Overdue concepts
  let overdueConceptDays = 0
  let overdueConceptName = null
  let overdueConceptStrength = 0
  const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString()
  for (const c of concepts) {
    if (c.lastReviewed && c.lastReviewed < thirtyDaysAgo && (c.strength || 0) >= 50) {
      const days = Math.round((now - new Date(c.lastReviewed)) / 86400000)
      if (days > overdueConceptDays) {
        overdueConceptDays = days
        overdueConceptName = c.name
        overdueConceptStrength = c.strength || 0
      }
    }
  }

  // Over-reviewed concept this week
  let overReviewedConcept = null
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  for (const c of concepts) {
    const weekReviews = (c.reviewHistory || []).filter(r => r.date >= weekStart.toISOString()).length
    if (weekReviews >= 5 && (c.strength || 0) >= 80) {
      overReviewedConcept = { name: c.name, reviews: weekReviews, strength: c.strength }
      break
    }
  }

  // Mode avoidance — find modes not used in 14+ days
  const modeLogs = safeGet('jos-api-logs', [])
  const modeLastUsed = {}
  for (const log of modeLogs) {
    if (log.mode && log.timestamp) {
      if (!modeLastUsed[log.mode] || log.timestamp > modeLastUsed[log.mode]) {
        modeLastUsed[log.mode] = log.timestamp
      }
    }
  }
  let avoidedMode = null
  let daysAvoidingMode = 0
  const fourteenDaysAgo = new Date(now - 14 * 86400000).toISOString()
  for (const m of HARD_MODES) {
    if (modeLastUsed[m] && modeLastUsed[m] < fourteenDaysAgo) {
      const days = Math.round((now - new Date(modeLastUsed[m])) / 86400000)
      if (days > daysAvoidingMode) { daysAvoidingMode = days; avoidedMode = m }
    }
  }

  // Recent rejection (within 48 hours)
  const recentRejection = applications.some(a =>
    a.status === 'rejected' && a.date && (now - new Date(a.date)) < 48 * 3600000
  )

  // Today session logged
  const todaySessionLogged = todayTimer && sessionMinutes > 0

  // Weekly review done
  const weekly = safeGet('jos-weekly', {})
  const weeklyReviewDone = weekly.lastReview && weekly.lastReview.split('T')[0] === today

  return {
    hour, dayOfWeek, energy, energySet, medState, sessionHours, sessionMinutes,
    foodEaten, lastSleep, daysSinceCheckin, consecutiveHardModes,
    overdueConceptDays, overdueConceptName, overdueConceptStrength,
    overReviewedConcept, avoidedMode, daysAvoidingMode,
    recentRejection, todaySessionLogged, weeklyReviewDone,
  }
}

/**
 * Check if a conviction triggers for the given mode.
 * @param {Object} context — from buildConvictionContext() + { mode }
 * @returns {Object|null} — { type, message, suggestion, allowOverride, priority }
 */
export function checkConviction(context) {
  const { mode, hour, energy, medState } = context

  // 1. Hard mode + late night + low energy
  if (HARD_MODES.includes(mode) && (hour >= 23 || hour <= 5) && energy <= 2) {
    return {
      type: 'refuse', priority: 'critical',
      message: `Sir, I'd advise against ${mode.replace(/-/g, ' ')} right now. Energy at ${energy}, late hour. The expected value is negative.`,
      suggestion: 'Body Double or sleep',
      allowOverride: true,
    }
  }

  // 2. Hard mode + meds off + low energy
  if (HARD_MODES.includes(mode) && medState === 'off' && energy <= 3) {
    return {
      type: 'caution', priority: 'high',
      message: `Medication has worn off and energy is at ${energy}. Hard modes will feel significantly more difficult.`,
      suggestion: 'Quiz or Teach mode',
      allowOverride: true,
    }
  }

  // 3. No food for 5+ hours
  if (context.sessionHours >= 5 && !context.foodEaten) {
    return {
      type: 'caution', priority: 'high',
      message: "Sir, it's been over five hours without a meal. Your cognitive performance drops measurably after four hours unfueled.",
      suggestion: 'Eat first, then continue',
      allowOverride: true,
    }
  }

  // 4. 3+ hard modes in a row
  if (context.consecutiveHardModes >= 3) {
    return {
      type: 'caution', priority: 'medium',
      message: 'Three intensive modes in sequence, Sir. Diminishing returns set in. A ten-minute break would reset your processing.',
      suggestion: 'Body Double or walk',
      allowOverride: true,
    }
  }

  // 5. Session exceeds 6 hours
  if (context.sessionHours >= 6) {
    return {
      type: 'refuse', priority: 'critical',
      message: "Sir, six hours. I've watched your response quality decline over the last ninety minutes. I'd strongly recommend stopping.",
      suggestion: 'Save progress, rest, return tomorrow',
      allowOverride: true,
    }
  }

  // 6. Late night + poor sleep
  if ((hour >= 23 || hour <= 4) && context.lastSleep <= 2) {
    return {
      type: 'refuse', priority: 'critical',
      message: "Sir, you reported poor sleep last night and it's past eleven. Compounding sleep debt is dangerous for ADHD-PI brains.",
      suggestion: 'Sleep. Everything else is secondary.',
      allowOverride: true,
    }
  }

  // 7. Interview mode after recent rejection (RSD risk)
  if (context.recentRejection && ['interview-sim', 'presser', 'recruiter-ghost'].includes(mode)) {
    return {
      type: 'caution', priority: 'high',
      message: 'Sir, there was a rejection within the last 48 hours. Interview modes right now risk reinforcing negative patterns.',
      suggestion: 'Impostor Killer mode — review what you DO know',
      allowOverride: true,
    }
  }

  // 8. Skipping check-in for 3+ days
  if (context.daysSinceCheckin >= 3) {
    return {
      type: 'nudge', priority: 'high',
      message: `Sir, it's been ${context.daysSinceCheckin} days since your last check-in. I'm operating blind — my recommendations are based on stale data.`,
      suggestion: 'Quick 30-second check-in',
      allowOverride: true,
    }
  }

  // 9. No energy set after 5 minutes
  if (!context.energySet && context.sessionMinutes >= 5) {
    return {
      type: 'nudge', priority: 'medium',
      message: "Sir, you haven't set your energy level. I'm calibrating blind — all my suggestions may be misaligned.",
      suggestion: 'Set energy (5 seconds)',
      allowOverride: true,
    }
  }

  // 10. Avoiding a mode 14+ days
  if (context.daysAvoidingMode >= 14 && context.avoidedMode) {
    return {
      type: 'observation', priority: 'medium',
      message: `I've noticed you haven't entered ${context.avoidedMode.replace(/-/g, ' ')} in ${context.daysAvoidingMode} days. The avoidance itself is data, Sir.`,
      suggestion: `One round of ${context.avoidedMode.replace(/-/g, ' ')} — just to prove you can`,
      allowOverride: true,
    }
  }

  // 11. Overdue concept (30+ days, was strong)
  if (context.overdueConceptDays >= 30 && context.overdueConceptName) {
    return {
      type: 'nudge', priority: 'medium',
      message: `Sir, ${context.overdueConceptName} hasn't been reviewed in ${context.overdueConceptDays} days. It was at ${context.overdueConceptStrength}% — that knowledge is actively decaying.`,
      suggestion: `Quick 5-minute review of ${context.overdueConceptName}`,
      allowOverride: true,
    }
  }

  // 12. Over-reviewing same concept (perfectionism)
  if (context.overReviewedConcept) {
    return {
      type: 'observation', priority: 'medium',
      message: `You've reviewed ${context.overReviewedConcept.name} ${context.overReviewedConcept.reviews} times this week. It's at ${context.overReviewedConcept.strength}%. This is perfectionism, not learning.`,
      suggestion: 'Focus on lowest-strength concept instead',
      allowOverride: true,
    }
  }

  // 13. Sunday evening + no weekly review
  if (context.dayOfWeek === 0 && hour >= 18 && !context.weeklyReviewDone) {
    return {
      type: 'nudge', priority: 'medium',
      message: 'Sunday evening, Sir. Weekly review not yet done. The War Council Brief needs data to generate.',
      suggestion: 'Run weekly review now',
      allowOverride: true,
    }
  }

  // 14. Streak at risk (23:30+ no session today)
  if (hour === 23 && new Date().getMinutes() >= 30 && !context.todaySessionLogged) {
    return {
      type: 'urgent', priority: 'critical',
      message: 'Sir. Thirty minutes until midnight. Your streak is at risk.',
      suggestion: 'Even a 5-minute check-in saves the streak',
      allowOverride: true,
    }
  }

  return null
}

/**
 * Get ALL triggered convictions sorted by priority.
 * Used by briefing to show top 1-2 convictions.
 */
export function getActiveConvictions() {
  const ctx = buildConvictionContext()
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  const convictions = []

  // Check each conviction by creating context with different modes
  const genericCtx = { ...ctx, mode: null }
  // Non-mode convictions (food, session, check-in, energy, avoidance, overdue, perfectionism, weekly, streak)
  const checks = [
    () => ctx.sessionHours >= 5 && !ctx.foodEaten ? { type: 'caution', priority: 'high', message: "Over five hours without a meal." } : null,
    () => ctx.sessionHours >= 6 ? { type: 'refuse', priority: 'critical', message: "Six-hour session. Rest recommended." } : null,
    () => ctx.daysSinceCheckin >= 3 ? { type: 'nudge', priority: 'high', message: `${ctx.daysSinceCheckin} days since last check-in.` } : null,
    () => !ctx.energySet && ctx.sessionMinutes >= 5 ? { type: 'nudge', priority: 'medium', message: "Energy level not set." } : null,
    () => ctx.daysAvoidingMode >= 14 && ctx.avoidedMode ? { type: 'observation', priority: 'medium', message: `${ctx.avoidedMode.replace(/-/g,' ')} avoided ${ctx.daysAvoidingMode} days.` } : null,
    () => ctx.overdueConceptDays >= 30 && ctx.overdueConceptName ? { type: 'nudge', priority: 'medium', message: `${ctx.overdueConceptName} overdue ${ctx.overdueConceptDays} days.` } : null,
    () => ctx.overReviewedConcept ? { type: 'observation', priority: 'medium', message: `${ctx.overReviewedConcept.name} over-reviewed.` } : null,
    () => ctx.dayOfWeek === 0 && ctx.hour >= 18 && !ctx.weeklyReviewDone ? { type: 'nudge', priority: 'medium', message: 'Weekly review pending.' } : null,
    () => ctx.hour === 23 && new Date().getMinutes() >= 30 && !ctx.todaySessionLogged ? { type: 'urgent', priority: 'critical', message: 'Streak at risk.' } : null,
  ]

  for (const check of checks) {
    const result = check()
    if (result) convictions.push(result)
  }

  return convictions.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3))
}
