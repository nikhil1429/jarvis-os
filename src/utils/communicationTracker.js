// communicationTracker.js — Tracks which JARVIS communication styles get engagement
// WHY: JARVIS learns HOW to talk to Nikhil. Over time, adapts to what resonates.
// Engagement = user responded with longer message (engaged) vs shorter/dismissive.

/**
 * Track engagement for a communication style.
 */
export function trackEngagement(type, engaged) {
  try {
    const tracker = JSON.parse(localStorage.getItem('jos-comm-effectiveness') || '{}')
    if (!tracker[type]) tracker[type] = { shown: 0, engaged: 0 }
    tracker[type].shown++
    if (engaged) tracker[type].engaged++
    localStorage.setItem('jos-comm-effectiveness', JSON.stringify(tracker))
  } catch { /* ok */ }
}

/**
 * Get communication insights (requires 50+ interactions).
 */
export function getCommunicationInsights() {
  try {
    const tracker = JSON.parse(localStorage.getItem('jos-comm-effectiveness') || '{}')
    const total = Object.values(tracker).reduce((s, t) => s + t.shown, 0)
    if (total < 20) return null
    const rates = Object.entries(tracker)
      .filter(([, data]) => data.shown >= 3)
      .map(([type, data]) => ({
        type, rate: data.shown > 0 ? data.engaged / data.shown : 0, shown: data.shown,
      })).sort((a, b) => b.rate - a.rate)
    if (rates.length < 2) return null
    return { bestStyle: rates[0], worstStyle: rates[rates.length - 1], totalInteractions: total }
  } catch { return null }
}

/**
 * Classify JARVIS's response into communication styles.
 * Called after each JARVIS response.
 * @param {string} jarvisMessage — the response text
 * @returns {string[]} — detected styles
 */
export function classifyStyle(jarvisMessage) {
  if (!jarvisMessage) return ['direct']
  const styles = []
  const msg = jarvisMessage

  // Question-heavy (Socratic)
  if ((msg.match(/\?/g) || []).length >= 2) styles.push('question')

  // Data-heavy (numbers, percentages, stats)
  if (/\d+%|\d+ days|\d+\/\d+|\d+\.\d/.test(msg)) styles.push('data-heavy')

  // Detailed (long response)
  if (msg.length > 500) styles.push('detailed')

  // Direct (short response)
  if (msg.length < 100) styles.push('direct')

  // Humor (tagged with [witty] or characteristic wit patterns)
  if (/\[witty\]/i.test(msg) || /I believe that's what|fascinating approach|your optimism is/i.test(msg)) {
    styles.push('humor')
  }

  // Analogy
  if (/like a|think of it as|imagine|picture this|consider it/i.test(msg)) styles.push('analogy')

  // Encouragement
  if (/you can|you've got|well done|impressive|good work|solid|excellent/i.test(msg)) styles.push('encouragement')

  // Challenge
  if (/can you|prove|show me|handle|push|harder|defend your/i.test(msg)) styles.push('challenge')

  return styles.length > 0 ? styles : ['direct']
}

/**
 * Track user response as engagement signal.
 * Compare user's response length to their running average.
 * @param {string[]} jarvisStyles — styles from classifyStyle
 * @param {number} userResponseLength — user message character count
 */
export function trackResponse(jarvisStyles, userResponseLength) {
  try {
    // Get running average of user message lengths
    const stats = JSON.parse(localStorage.getItem('jos-comm-stats') || '{"total":0,"sum":0}')
    stats.total++
    stats.sum += userResponseLength
    const runningAvg = stats.sum / stats.total
    localStorage.setItem('jos-comm-stats', JSON.stringify(stats))

    // Engaged if response is longer than 80% of their average
    const engaged = userResponseLength > runningAvg * 0.8

    // Track each style
    for (const style of jarvisStyles) {
      trackEngagement(style, engaged)
    }
  } catch { /* ok */ }
}

/**
 * Get communication insights as system prompt context.
 */
export function getCommunicationPrompt() {
  const insights = getCommunicationInsights()
  if (!insights) return ''

  const lines = ['COMMUNICATION CALIBRATION (from tracked engagement data):']
  if (insights.bestStyle) {
    lines.push(`- Nikhil responds best to: ${insights.bestStyle.type} (${Math.round(insights.bestStyle.rate * 100)}% engagement, ${insights.bestStyle.shown} interactions)`)
  }
  if (insights.worstStyle) {
    lines.push(`- Nikhil disengages most with: ${insights.worstStyle.type} (${Math.round(insights.worstStyle.rate * 100)}% engagement, ${insights.worstStyle.shown} interactions)`)
  }
  if (insights.bestStyle && insights.worstStyle) {
    lines.push(`- Use more ${insights.bestStyle.type}, less ${insights.worstStyle.type}.`)
  }
  return lines.join('\n')
}
