// jarvisInitiator.js — JARVIS reaches out when important events happen
// WHY: JARVIS shouldn't wait to be summoned. Streak at risk, no check-in,
// concept decay — voice button glows or ghost card appears.

function safeGet(key, fb) { try { return JSON.parse(localStorage.getItem(key)) || fb } catch { return fb } }

const CHECKS = [
  {
    id: 'streak-risk',
    check: () => {
      const core = safeGet('jos-core', {})
      if ((core.streak || 0) < 3) return false
      const last = core.lastActivityDate
      return last && (Date.now() - new Date(last).getTime()) / 3600000 > 20
    },
    type: 'glow', message: 'Streak at risk, Sir. A quick check-in preserves it.', priority: 'high'
  },
  {
    id: 'no-checkin',
    check: () => {
      const feelings = safeGet('jos-feelings', [])
      const today = new Date().toISOString().slice(0, 10)
      return !feelings.some(f => f.date?.startsWith(today)) && new Date().getHours() >= 20
    },
    type: 'glow', message: 'Daily check-in pending, Sir.', priority: 'medium'
  },
  {
    id: 'concept-decay',
    check: () => {
      const concepts = safeGet('jos-concepts', [])
      return concepts.some(c => c.lastReviewed && (c.strength || 0) >= 50 && (Date.now() - new Date(c.lastReviewed).getTime()) / 86400000 > 14)
    },
    type: 'ghost', message: 'Concepts decaying without review.', priority: 'low'
  },
  {
    id: 'long-inactivity',
    check: () => {
      const timer = safeGet('jos-session-timer', [])
      const today = timer.find(t => t.date === new Date().toISOString().slice(0, 10))
      if (!today?.sessions?.length) return false
      const last = today.sessions[today.sessions.length - 1]
      return last.end && (Date.now() - new Date(last.end).getTime()) / 3600000 > 3
    },
    type: 'glow', message: 'Been a while, Sir. Ready when you are.', priority: 'low'
  },
]

export function startInitiator() {
  return setInterval(() => {
    for (const check of CHECKS) {
      try {
        if (check.check()) {
          window.dispatchEvent(new CustomEvent('jarvis-initiate', { detail: { id: check.id, type: check.type, message: check.message, priority: check.priority } }))
          break // One at a time
        }
      } catch { /* ok */ }
    }
  }, 60000)
}

export function stopInitiator(id) { clearInterval(id) }
