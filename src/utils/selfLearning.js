// selfLearning.js — JARVIS learns from own mistakes
// WHY: Every suggestion JARVIS makes is tracked. If break suggestions get
// ignored 80% of the time, JARVIS should suggest breaks less often.
// If mode-switch suggestions are followed 90%, do more of those.

function safeGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

/**
 * Log a piece of JARVIS advice for outcome tracking.
 * @param {{ text, type, energy?, mode?, suggestedMode? }} advice
 * @returns {number} adviceId for later outcome marking
 */
export function logAdvice(advice) {
  try {
    const log = safeGet('jos-advice-log', [])
    const id = Date.now()
    log.push({
      id,
      text: (advice.text || '').slice(0, 200),
      type: advice.type, // 'break', 'mode-switch', 'concept-review', 'task', 'concern', 'checkin'
      timestamp: new Date().toISOString(),
      followed: null,
      suggestedMode: advice.suggestedMode || null,
      context: {
        energy: advice.energy || null,
        hour: new Date().getHours(),
        mode: advice.mode || null,
      },
    })
    if (log.length > 200) log.splice(0, log.length - 200)
    localStorage.setItem('jos-advice-log', JSON.stringify(log))
    return id
  } catch { return 0 }
}

/**
 * Mark whether advice was followed.
 * @param {number} adviceId
 * @param {boolean} followed
 */
export function markAdviceOutcome(adviceId, followed) {
  try {
    const log = safeGet('jos-advice-log', [])
    const entry = log.find(a => a.id === adviceId)
    if (entry) {
      entry.followed = followed
      localStorage.setItem('jos-advice-log', JSON.stringify(log))
    }
  } catch { /* ok */ }
}

/**
 * Get the most recent unresolved advice (for dismissal detection).
 */
export function getLastUnresolvedAdvice() {
  const log = safeGet('jos-advice-log', [])
  return log.filter(a => a.followed === null).pop() || null
}

/**
 * Auto-detect dismissal: if last advice was a break/mode suggestion
 * and user entered a different mode or kept going, mark as not followed.
 * @param {string} userAction — what user actually did ('mode-enter', 'message-sent')
 * @param {string} currentMode — which mode user is in
 */
export function autoDetectDismissal(userAction, currentMode) {
  const last = getLastUnresolvedAdvice()
  if (!last) return
  // Only auto-resolve if advice is recent (< 10 minutes old)
  if (Date.now() - last.id > 10 * 60 * 1000) return

  if (last.type === 'break' && userAction === 'message-sent') {
    markAdviceOutcome(last.id, false)
  }
  if (last.type === 'mode-switch' && last.suggestedMode && currentMode !== last.suggestedMode) {
    markAdviceOutcome(last.id, false)
  }
}

/**
 * Analyze patterns in what advice gets followed vs ignored.
 * @returns {{ byType, byHour, total }|null}
 */
export function getAdviceEffectiveness() {
  const log = safeGet('jos-advice-log', [])
  const withOutcome = log.filter(a => a.followed !== null)
  if (withOutcome.length < 10) return null

  const byType = {}
  withOutcome.forEach(a => {
    if (!byType[a.type]) byType[a.type] = { followed: 0, ignored: 0 }
    if (a.followed) byType[a.type].followed++
    else byType[a.type].ignored++
  })

  const byHour = {}
  withOutcome.forEach(a => {
    const bucket = a.context.hour < 12 ? 'morning' : a.context.hour < 18 ? 'afternoon' : 'evening'
    if (!byHour[bucket]) byHour[bucket] = { followed: 0, ignored: 0 }
    if (a.followed) byHour[bucket].followed++
    else byHour[bucket].ignored++
  })

  return { byType, byHour, total: withOutcome.length }
}

/**
 * Generate self-learning prompt for Claude system prompt.
 * Tells Claude which advice types work and which don't.
 */
export function getSelfLearningPrompt() {
  const effectiveness = getAdviceEffectiveness()
  if (!effectiveness) return ''

  const lines = ['SELF-LEARNING (adapt suggestions based on what Sir actually follows):']

  Object.entries(effectiveness.byType).forEach(([type, data]) => {
    const total = data.followed + data.ignored
    if (total < 5) return
    const rate = data.followed / total
    if (rate < 0.3) {
      lines.push(`- "${type}" suggestions: only ${Math.round(rate * 100)}% followed. Reduce frequency or change approach.`)
    } else if (rate > 0.7) {
      lines.push(`- "${type}" suggestions: ${Math.round(rate * 100)}% followed. These work. Continue.`)
    }
  })

  Object.entries(effectiveness.byHour).forEach(([bucket, data]) => {
    const total = data.followed + data.ignored
    if (total < 5) return
    const rate = data.followed / total
    if (rate < 0.3) {
      lines.push(`- ${bucket} suggestions mostly ignored (${Math.round(rate * 100)}%). Reduce proactive advice during ${bucket}.`)
    }
  })

  return lines.length > 1 ? lines.join('\n') : ''
}
