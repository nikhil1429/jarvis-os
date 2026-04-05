// proactiveEngine.js — JARVIS recommends THE optimal action right now
// WHY: Instead of Nikhil choosing what to do, JARVIS analyzes ALL signals
// (energy, time, concepts, tasks, meds, streak) and suggests one thing.
// "Review RAG Retrieval — it's decaying and this is your optimal window."

function safeGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

/**
 * Analyze all signals and return the optimal action + alternatives.
 * @returns {{ top, alternatives, reasoning, signals }}
 */
export function suggestOptimalAction() {
  const now = new Date()
  const hour = now.getHours()
  const core = safeGet('jos-core', {})
  const energy = core.energy || 3
  const concepts = safeGet('jos-concepts', [])
  const feelings = safeGet('jos-feelings', [])
  const lastCheckin = feelings[feelings.length - 1] || {}
  const timerData = safeGet('jos-session-timer', [])
  const today = now.toISOString().split('T')[0]
  const todayTimer = Array.isArray(timerData) ? timerData.find(t => t.date === today) : null
  const sessionMinutes = todayTimer?.totalMinutes || 0

  // Meds
  const onboarding = safeGet('jos-onboarding', {})
  const medHour = parseInt(onboarding.adhd?.medicationTime) || 10
  const medDuration = parseInt(onboarding.adhd?.medicationDuration) || 8
  const medsWearingOff = lastCheckin.meds === true && hour >= medHour + medDuration

  // Hours since check-in
  const lastCheckinDate = lastCheckin.date ? new Date(lastCheckin.date) : null
  const hoursSinceCheckin = lastCheckinDate
    ? Math.round((now - lastCheckinDate) / 3600000)
    : 999

  // Pending tasks
  const completedTasks = core.completedTasks || []
  let pendingCount = 0
  try {
    // Dynamic import not possible here, approximate from task data
    const totalTasks = 82 // TASKS.length from data file
    pendingCount = totalTasks - completedTasks.length
  } catch { pendingCount = 40 }

  // === BUILD CANDIDATES ===
  const candidates = []

  // 1. Check-in needed (highest urgency if stale)
  if (hoursSinceCheckin > 8) {
    candidates.push({
      type: 'checkin',
      label: 'Quick check-in (30 seconds)',
      urgency: 0.85,
      energyCost: 'none',
      optimalEnergy: [1, 2, 3, 4, 5],
      optimalHours: allHours(),
      reason: `${Math.round(hoursSinceCheckin)} hours since last check-in. I'm calibrating on stale data.`,
      action: { type: 'checkin' },
      emoji: '📋',
    })
  }

  // 2. Overdue concept reviews (spaced repetition)
  const spacedSchedule = [1, 3, 7, 14, 30, 60]
  for (const c of concepts) {
    if (!c.lastReviewed) continue
    const daysSince = (Date.now() - new Date(c.lastReviewed).getTime()) / 86400000
    const strength = c.strength || 0
    const nextReviewDay = spacedSchedule.find(d => d > daysSince) || 60
    const overdue = daysSince > nextReviewDay

    if (overdue || (daysSince > 7 && strength >= 40)) {
      candidates.push({
        type: 'concept-review',
        label: `Review ${c.name} (${strength}%, ${Math.round(daysSince)}d overdue)`,
        urgency: overdue ? 0.8 : 0.5,
        energyCost: strength > 60 ? 'low' : 'medium',
        optimalEnergy: [2, 3, 4, 5],
        optimalHours: [9, 10, 11, 14, 15, 16],
        reason: `${c.name} at ${strength}% hasn't been reviewed in ${Math.round(daysSince)} days. Knowledge decays exponentially.`,
        action: { type: 'mode', mode: 'quiz', concept: c.name },
        emoji: '🧠',
      })
    }
  }

  // 3. Build task (if energy supports it)
  if (pendingCount > 0 && energy >= 3) {
    candidates.push({
      type: 'task',
      label: `Build next task (${pendingCount} remaining)`,
      urgency: 0.7,
      energyCost: 'high',
      optimalEnergy: [3, 4, 5],
      optimalHours: [9, 10, 11, 14, 15, 16, 17],
      reason: `${pendingCount} tasks remaining. Building is the primary mission.`,
      action: { type: 'mode', mode: 'body-double' },
      emoji: '🔨',
    })
  }

  // 4. Hard training (high energy window)
  if (energy >= 4 && !medsWearingOff) {
    candidates.push({
      type: 'training-hard',
      label: 'Pressure test (Presser mode)',
      urgency: 0.45,
      energyCost: 'high',
      optimalEnergy: [4, 5],
      optimalHours: [10, 11, 14, 15],
      reason: 'High energy window. Best time for interview prep intensity.',
      action: { type: 'mode', mode: 'presser' },
      emoji: '🔥',
    })
  }

  // 5. Easy training (low energy)
  if (energy <= 2) {
    candidates.push({
      type: 'training-easy',
      label: 'Teach mode (explain what you know)',
      urgency: 0.5,
      energyCost: 'low',
      optimalEnergy: [1, 2, 3],
      optimalHours: [8, 9, 18, 19, 20, 21],
      reason: 'Low energy but productive. Teaching consolidates knowledge without draining you.',
      action: { type: 'mode', mode: 'teach' },
      emoji: '📖',
    })
  }

  // 6. Body Double (medium energy + tasks)
  if (energy >= 2 && energy <= 3 && pendingCount > 0) {
    candidates.push({
      type: 'body-double',
      label: '25-min Body Double sprint',
      urgency: 0.55,
      energyCost: 'medium',
      optimalEnergy: [2, 3],
      optimalHours: [10, 11, 14, 15, 16],
      reason: 'Medium energy + pending tasks = perfect for accountability sprint.',
      action: { type: 'mode', mode: 'body-double' },
      emoji: '⏱️',
    })
  }

  // 7. Wind down (late night)
  if (hour >= 22 || hour < 5) {
    candidates.push({
      type: 'wind-down',
      label: 'Wrap up and rest',
      urgency: 0.6,
      energyCost: 'none',
      optimalEnergy: [1, 2, 3, 4, 5],
      optimalHours: [22, 23, 0, 1, 2, 3, 4],
      reason: "It's late. Rest is a strategic investment, not a luxury.",
      action: { type: 'rest' },
      emoji: '🌙',
    })
  }

  // === SCORE AND RANK ===
  const scored = candidates.map(c => {
    let score = c.urgency

    // Energy match
    if (c.optimalEnergy.includes(energy)) score += 0.2
    else score -= 0.3

    // Time match
    if (c.optimalHours.includes(hour)) score += 0.15

    // Meds wearing off penalty for hard tasks
    if (medsWearingOff && c.energyCost === 'high') score -= 0.4

    // Late night penalty (except wind-down and check-in)
    if ((hour >= 23 || hour < 6) && c.type !== 'wind-down' && c.type !== 'checkin') score -= 0.3

    // Long session bonus for breaks
    if (sessionMinutes > 180 && c.type === 'wind-down') score += 0.2

    return { ...c, score: Math.round(score * 100) / 100 }
  })

  scored.sort((a, b) => b.score - a.score)

  return {
    top: scored[0] || null,
    alternatives: scored.slice(1, 3),
    reasoning: scored[0]?.reason || 'No suggestions available.',
    signals: { energy, hour, medsWearingOff, hoursSinceCheckin, pendingTasks: pendingCount, sessionMinutes },
  }
}

/**
 * Get proactive suggestion as system prompt context.
 */
export function getProactiveSuggestionPrompt() {
  const suggestion = suggestOptimalAction()
  if (!suggestion.top) return ''
  return `PROACTIVE SUGGESTION: I recommend "${suggestion.top.label}" right now. Reason: ${suggestion.reasoning}. Energy: ${suggestion.signals.energy}/5, Time: ${suggestion.signals.hour}:00. If Sir asks "what should I do?" or seems undecided, suggest this naturally.`
}

function allHours() { return Array.from({ length: 24 }, (_, i) => i) }
