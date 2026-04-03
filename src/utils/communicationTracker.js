// communicationTracker.js — Tracks which JARVIS communication styles get engagement

export function trackEngagement(type, engaged) {
  try {
    const tracker = JSON.parse(localStorage.getItem('jos-comm-effectiveness') || '{}')
    if (!tracker[type]) tracker[type] = { shown: 0, engaged: 0 }
    tracker[type].shown++
    if (engaged) tracker[type].engaged++
    localStorage.setItem('jos-comm-effectiveness', JSON.stringify(tracker))
  } catch { /* ok */ }
}

export function getCommunicationInsights() {
  try {
    const tracker = JSON.parse(localStorage.getItem('jos-comm-effectiveness') || '{}')
    const total = Object.values(tracker).reduce((s, t) => s + t.shown, 0)
    if (total < 50) return null
    const rates = Object.entries(tracker).map(([type, data]) => ({
      type, rate: data.shown > 0 ? data.engaged / data.shown : 0, shown: data.shown,
    })).sort((a, b) => b.rate - a.rate)
    return { bestStyle: rates[0], worstStyle: rates[rates.length - 1], totalInteractions: total }
  } catch { return null }
}
