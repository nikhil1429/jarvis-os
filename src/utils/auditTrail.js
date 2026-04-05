// auditTrail.js — Logs every JARVIS interaction for analysis
// WHY: Quarterly Report, Newsletter, and self-analysis need a complete
// record of what JARVIS did. Every advice, prediction, observation,
// conviction, and celebration → logged with context.

function safeGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

/**
 * Log an interaction to the audit trail.
 * @param {{ type, content, outcome?, energy?, mode?, streak? }} interaction
 */
export function logInteraction(interaction) {
  try {
    const trail = safeGet('jos-audit-trail', [])
    trail.push({
      timestamp: new Date().toISOString(),
      type: interaction.type, // 'advice', 'prediction', 'observation', 'conviction', 'celebration', 'avoidance', 'difficulty-adjust'
      content: (interaction.content || '').slice(0, 200),
      outcome: interaction.outcome || null,
      context: {
        energy: interaction.energy || null,
        mode: interaction.mode || null,
        streak: interaction.streak || null,
      },
    })
    if (trail.length > 500) trail.splice(0, trail.length - 500)
    localStorage.setItem('jos-audit-trail', JSON.stringify(trail))
  } catch { /* ok */ }
}

/**
 * Get audit summary for reports (Quarterly, Newsletter).
 * @returns {{ totalInteractions, adviceGiven, predictionsMade, convictionsTriggered, celebrationsFired, observationsMade }}
 */
export function getAuditSummary() {
  const trail = safeGet('jos-audit-trail', [])
  return {
    totalInteractions: trail.length,
    adviceGiven: trail.filter(t => t.type === 'advice').length,
    predictionsMade: trail.filter(t => t.type === 'prediction').length,
    convictionsTriggered: trail.filter(t => t.type === 'conviction').length,
    celebrationsFired: trail.filter(t => t.type === 'celebration').length,
    observationsMade: trail.filter(t => t.type === 'observation').length,
    avoidanceFlags: trail.filter(t => t.type === 'avoidance').length,
    difficultyAdjusts: trail.filter(t => t.type === 'difficulty-adjust').length,
  }
}

/**
 * Get recent trail entries (last N).
 */
export function getRecentTrail(n = 20) {
  const trail = safeGet('jos-audit-trail', [])
  return trail.slice(-n)
}

/**
 * Get audit summary as system prompt context (for Quarterly Report mode).
 */
export function getAuditPrompt() {
  const summary = getAuditSummary()
  if (summary.totalInteractions < 10) return ''
  return `AUDIT TRAIL: ${summary.totalInteractions} total interactions logged. ${summary.adviceGiven} advice given, ${summary.celebrationsFired} celebrations, ${summary.convictionsTriggered} convictions triggered, ${summary.observationsMade} observations.`
}
