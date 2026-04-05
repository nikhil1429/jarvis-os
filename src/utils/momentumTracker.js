// momentumTracker.js — Real-time session momentum detection
// WHY: Detect whether Nikhil is accelerating, steady, decelerating, or stalling.
// "In flow — don't interrupt" vs "Pace dropped 60% — suggest break."
// Activities: messages sent, tasks completed, concept reviews, mode switches.

function safeGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

/**
 * Record an activity event for momentum tracking.
 * @param {string} type — 'message'|'task'|'concept'|'mode-switch'|'checkin'
 */
export function recordActivity(type) {
  try {
    const log = safeGet('jos-momentum', [])
    log.push({ type, time: Date.now() })
    // Keep last 100 events
    if (log.length > 100) log.splice(0, log.length - 100)
    localStorage.setItem('jos-momentum', JSON.stringify(log))
  } catch { /* ok */ }
}

/**
 * Calculate current session momentum.
 * @returns {{ state, rate, message, suggestion? }}
 */
export function getMomentum() {
  const log = safeGet('jos-momentum', [])
  if (log.length < 5) return { state: 'insufficient', rate: 0 }

  const now = Date.now()
  const last30min = log.filter(e => now - e.time < 30 * 60000)
  const prev30min = log.filter(e => now - e.time >= 30 * 60000 && now - e.time < 60 * 60000)

  const currentRate = last30min.length
  const previousRate = prev30min.length

  // Stalling: was active, now nothing
  if (currentRate === 0 && previousRate >= 3) {
    return {
      state: 'stalling',
      rate: 0,
      previousRate,
      message: 'Activity has stopped. Stuck, or just thinking?',
      suggestion: 'Quick capture what you are thinking, or switch tasks',
    }
  }

  // Decelerating: significant drop
  if (previousRate >= 3 && currentRate < previousRate * 0.4) {
    const dropPercent = Math.round((1 - currentRate / previousRate) * 100)
    return {
      state: 'decelerating',
      rate: currentRate,
      previousRate,
      dropPercent,
      message: `Pace dropped ${dropPercent}% in the last 30 minutes.`,
      suggestion: 'Break, mode switch, or easier task',
    }
  }

  // Accelerating: significant increase
  if (previousRate >= 2 && currentRate > previousRate * 1.5) {
    return {
      state: 'accelerating',
      rate: currentRate,
      previousRate,
      message: 'Picking up speed. Momentum is building.',
      suggestion: 'Keep going — this is flow state',
    }
  }

  // Steady
  return {
    state: 'steady',
    rate: currentRate,
    message: 'Steady pace. Consistent output.',
  }
}

/**
 * Get momentum as system prompt context for Claude.
 */
export function getMomentumPrompt() {
  const m = getMomentum()
  if (m.state === 'insufficient') return ''

  let prompt = `SESSION MOMENTUM: ${m.state.toUpperCase()}.`
  if (m.state === 'stalling') {
    prompt += ' No activity for 30+ minutes. Check if stuck gently. Offer to help unstick WITHOUT being pushy.'
  } else if (m.state === 'decelerating') {
    prompt += ` Pace dropped ${m.dropPercent}%. Might be fatigue. Suggest break or mode switch naturally, once.`
  } else if (m.state === 'accelerating') {
    prompt += ' In flow. DO NOT interrupt with suggestions. Keep responses concise. Let him work.'
  } else if (m.state === 'steady') {
    prompt += ' Consistent activity. Normal engagement.'
  }
  return prompt
}

/**
 * Get momentum data for ghost card engine.
 */
export function getMomentumGhostCard() {
  const m = getMomentum()
  if (m.state === 'stalling') {
    return { id: 'momentum-stall', text: m.message + ' ' + (m.suggestion || '') }
  }
  if (m.state === 'decelerating' && m.dropPercent >= 50) {
    return { id: 'momentum-drop', text: m.message + ' ' + (m.suggestion || '') }
  }
  return null
}
