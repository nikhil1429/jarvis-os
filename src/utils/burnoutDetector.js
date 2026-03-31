// burnoutDetector.js — 6-indicator burnout detection system
// WHY: ADHD brains don't notice burnout creeping in until they crash.
// This system watches 6 leading indicators and raises warnings at 3+.
// Used by strategicCompiler and daily briefing to prescribe rest BEFORE crash.

const PREFIX = 'jos-'

function safeGet(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

/**
 * detect — Checks 6 burnout indicators, returns score and recommendation
 * @returns {{ indicators: string[], score: number, warning: boolean, recommendation: string|null }}
 */
export function detect() {
  const indicators = []

  const feelings = safeGet('feelings') || []
  const core = safeGet('core') || {}
  const sessionTimer = safeGet('session-timer') || {}

  const last7 = feelings.slice(-7)
  const last3 = feelings.slice(-3)

  // 1. Message length declining (avg word count dropping)
  try {
    const allMsgKeys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX + 'msgs-'))
    let recentLengths = []
    let olderLengths = []
    allMsgKeys.forEach(k => {
      const msgs = JSON.parse(localStorage.getItem(k)) || []
      const userMsgs = msgs.filter(m => m.role === 'user' && m.wordCount)
      const recent = userMsgs.slice(-5)
      const older = userMsgs.slice(-15, -5)
      recentLengths.push(...recent.map(m => m.wordCount))
      olderLengths.push(...older.map(m => m.wordCount))
    })
    if (recentLengths.length >= 3 && olderLengths.length >= 3) {
      const recentAvg = recentLengths.reduce((s, v) => s + v, 0) / recentLengths.length
      const olderAvg = olderLengths.reduce((s, v) => s + v, 0) / olderLengths.length
      if (recentAvg < olderAvg * 0.6) indicators.push('Message length declining')
    }
  } catch { /* skip */ }

  // 2. Session start times getting later
  if (sessionTimer.sessions && sessionTimer.sessions.length >= 3) {
    const lastThree = sessionTimer.sessions.slice(-3)
    const hours = lastThree.map(s => s.start ? new Date(s.start).getHours() : null).filter(Boolean)
    if (hours.length >= 2 && hours.every(h => h >= 23 || h < 5)) {
      indicators.push('Late session starts')
    }
  }

  // 3. Check-in fields being skipped (null count increasing)
  if (last3.length >= 2) {
    const nullFields = last3.map(f => {
      let nulls = 0
      if (!f.confidence) nulls++
      if (!f.focus) nulls++
      if (!f.motivation) nulls++
      if (!f.sleep) nulls++
      if (!f.mood) nulls++
      return nulls
    })
    if (nullFields.every(n => n >= 3)) indicators.push('Check-in fields being skipped')
  }

  // 4. Mode avoidance (only using 1-2 modes)
  try {
    const usedModes = Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX + 'msgs-'))
      .filter(k => {
        const msgs = JSON.parse(localStorage.getItem(k)) || []
        return msgs.filter(m => m.role === 'user').length > 0
      }).length
    if (usedModes <= 2 && feelings.length > 7) {
      indicators.push('Mode avoidance pattern')
    }
  } catch { /* skip */ }

  // 5. Journal negativity (keyword detection)
  const negativeWords = ['tired', 'exhausted', 'frustrated', 'angry', 'hopeless',
    'worthless', 'stuck', 'hate', 'can\'t', 'impossible', 'giving up', 'quit']
  const recentJournals = last7.filter(f => f.journal).map(f => f.journal.toLowerCase())
  const negativeCount = recentJournals.reduce((count, j) =>
    count + negativeWords.filter(w => j.includes(w)).length, 0)
  if (negativeCount >= 3) indicators.push('Journal negativity detected')

  // 6. Streak breaks frequency
  if (core.streak === 1 && feelings.length > 14) {
    indicators.push('Recent streak break')
  }

  const score = indicators.length
  return {
    indicators,
    score,
    warning: score >= 3,
    recommendation: score >= 3
      ? 'Multiple burnout indicators active. Recommend a rest day or reduced session, Sir.'
      : score >= 2
        ? 'Early burnout signals detected. Monitor closely.'
        : null,
  }
}
