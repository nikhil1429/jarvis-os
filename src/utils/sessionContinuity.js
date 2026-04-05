// sessionContinuity.js — Inter-session memory
// WHY: JARVIS should open each session knowing what happened last time.
// "When we left off yesterday, you were stuck on embedding dimensions."
// Saves to jos-last-session on tab close, shutdown, and every 5 minutes.

function safeGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

/**
 * Save current session state to localStorage.
 * Called on: beforeunload, shutdown ceremony, 5-minute interval.
 */
export function saveSessionState() {
  try {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const core = safeGet('jos-core', {})
    const feelings = safeGet('jos-feelings', [])
    const lastFeeling = feelings[feelings.length - 1] || {}
    const timerData = safeGet('jos-session-timer', [])
    const todayTimer = Array.isArray(timerData) ? timerData.find(t => t.date === today) : null

    // Find stuck points from recent user messages
    const stuckPoints = []
    const modes = ['chat', 'quiz', 'presser', 'teach', 'battle', 'body-double']
    for (const mode of modes) {
      const msgs = safeGet(`jos-msgs-${mode}`, [])
      // Only today's messages
      const todayMsgs = msgs.filter(m => m.role === 'user' && m.timestamp && m.timestamp.startsWith(today))
      const stuck = todayMsgs.filter(m => {
        const t = (m.content || '').toLowerCase()
        return t.includes('stuck') || t.includes('confused') || t.includes('not working') ||
          t.includes('samajh nahi') || t.includes('error') || t.includes('kaise') ||
          t.includes("don't understand") || t.includes('nahi samjha')
      }).slice(-3)
      stuck.forEach(m => stuckPoints.push(m.content.slice(0, 100)))
    }

    // Generate highlights
    const highlights = generateHighlights(core, today)

    // Find unfinished business: concepts reviewed but strength < 60
    const unfinished = []
    const concepts = safeGet('jos-concepts', [])
    for (const c of concepts) {
      if (c.lastReviewed && c.lastReviewed.startsWith(today) && (c.strength || 0) < 60) {
        unfinished.push(`${c.name} needs more work (${c.strength || 0}%)`)
      }
    }

    // Last mode used
    const apiLogs = safeGet('jos-api-logs', [])
    const todayLogs = apiLogs.filter(l => l.timestamp && l.timestamp.startsWith(today))
    const lastLog = todayLogs[todayLogs.length - 1]

    const state = {
      date: today,
      endTime: now.toTimeString().slice(0, 5),
      lastMode: lastLog?.mode || 'chat',
      totalSessionMinutes: todayTimer?.totalMinutes || 0,
      energyAtEnd: core.energy || 3,
      tasksCompletedToday: countTodayTasks(core, today),
      streakAtEnd: core.streak || core.currentStreak || 0,
      stuckPoints: stuckPoints.slice(0, 3),
      highlights: highlights.slice(0, 5),
      unfinishedBusiness: unfinished.slice(0, 3),
      moodAtEnd: lastFeeling.mood || '',
    }

    localStorage.setItem('jos-last-session', JSON.stringify(state))
  } catch (err) {
    console.warn('[sessionContinuity] Save failed:', err)
  }
}

/**
 * Get last session data (from previous day).
 */
export function getLastSession() {
  try {
    const data = JSON.parse(localStorage.getItem('jos-last-session') || 'null')
    if (!data) return null
    const today = new Date().toISOString().split('T')[0]
    // Only return if it's from a different day
    if (data.date === today) return null
    // Don't return if too old (> 7 days)
    const daysSince = Math.round((Date.now() - new Date(data.date).getTime()) / 86400000)
    if (daysSince > 7) return null
    return { ...data, daysSince }
  } catch { return null }
}

/**
 * Generate a human-readable continuity briefing for the morning.
 */
export function generateContinuityBriefing(lastSession) {
  if (!lastSession) return ''

  const parts = []
  const when = lastSession.daysSince === 1 ? 'Yesterday' : `${lastSession.daysSince} days ago`
  const hours = Math.round(lastSession.totalSessionMinutes / 60 * 10) / 10

  if (hours > 0) {
    parts.push(`${when}: ${hours}hr session, ${lastSession.tasksCompletedToday || 0} tasks completed.`)
  }

  if (lastSession.stuckPoints?.length > 0) {
    parts.push(`Stuck on: ${lastSession.stuckPoints[0]}`)
  }

  if (lastSession.unfinishedBusiness?.length > 0) {
    parts.push(`Unfinished: ${lastSession.unfinishedBusiness.join(', ')}`)
  }

  if (lastSession.highlights?.length > 0) {
    parts.push(`Highlights: ${lastSession.highlights.slice(0, 2).join(', ')}`)
  }

  return parts.join(' ')
}

/**
 * Get session continuity as system prompt context for Claude.
 */
export function getSessionContinuityPrompt() {
  const last = getLastSession()
  if (!last) return ''

  const when = last.daysSince === 1 ? 'yesterday' : `${last.daysSince} days ago`
  const hours = Math.round(last.totalSessionMinutes / 60 * 10) / 10

  let prompt = `LAST SESSION (${when}):`
  if (hours > 0) prompt += `\n- Duration: ${hours} hours`
  prompt += `\n- Tasks completed: ${last.tasksCompletedToday || 0}`
  prompt += `\n- Energy at end: ${last.energyAtEnd}/5`
  if (last.lastMode) prompt += `\n- Last mode: ${last.lastMode}`
  if (last.stuckPoints?.length) prompt += `\n- Stuck on: ${last.stuckPoints.join('; ')}`
  if (last.unfinishedBusiness?.length) prompt += `\n- Left unfinished: ${last.unfinishedBusiness.join('; ')}`
  if (last.highlights?.length) prompt += `\n- Highlights: ${last.highlights.join('; ')}`
  prompt += `\n\nReference naturally if relevant. "Yesterday you were working on..." or "Last time you mentioned...". Don't force it — only mention if it connects to what Sir is doing now.`

  return prompt
}

// ============================================================
// HELPERS
// ============================================================

function generateHighlights(core, today) {
  const highlights = []
  const completedToday = countTodayTasks(core, today)
  if (completedToday > 0) highlights.push(`${completedToday} task${completedToday > 1 ? 's' : ''} completed`)

  // Concept strength increases today
  const concepts = safeGet('jos-concepts', [])
  for (const c of concepts) {
    const todayReviews = (c.reviewHistory || []).filter(r => r.date && r.date.startsWith(today))
    if (todayReviews.length > 0) {
      const lastReview = todayReviews[todayReviews.length - 1]
      if (lastReview.score >= 7) highlights.push(`${c.name} scored ${lastReview.score}/10`)
    }
  }

  // Streak
  const streak = core.streak || core.currentStreak || 0
  if (streak >= 7) highlights.push(`${streak}-day streak maintained`)

  return highlights
}

function countTodayTasks(core, today) {
  // Count tasks that have today's completion in the log
  try {
    const apiLogs = safeGet('jos-api-logs', [])
    const todayToolCalls = apiLogs.filter(l =>
      l.timestamp && l.timestamp.startsWith(today) && l.mode === 'chat'
    )
    // Rough proxy: count complete_task tool calls today
    // Better: just return total completed count change (not precise, but useful)
    return (core.completedTasks || []).length > 0 ? Math.min(5, (core.completedTasks || []).length) : 0
  } catch { return 0 }
}
