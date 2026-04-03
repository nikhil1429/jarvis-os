// conversationMemory.js — Compress old conversation history into summaries
// WHY: After 50 messages, summarize oldest 30, keep latest 20.
// Preserves context indefinitely at minimal storage cost.

export function shouldCompress(modeKey) {
  try {
    const msgs = JSON.parse(localStorage.getItem(`jos-msgs-${modeKey}`) || '[]')
    return msgs.length >= 50
  } catch { return false }
}

export function getCompressionPrompt(modeKey) {
  try {
    const msgs = JSON.parse(localStorage.getItem(`jos-msgs-${modeKey}`) || '[]')
    const toCompress = msgs.slice(0, 30)
    const conversation = toCompress.map(m =>
      `${m.role === 'user' ? 'Nikhil' : 'JARVIS'}: ${m.content}`
    ).join('\n')

    return `Summarize this conversation between Nikhil and JARVIS in ${modeKey} mode.
Focus on: key insights, struggles identified, concepts discussed, breakthroughs, unresolved questions, and any commitments made.
Keep under 200 words. Factual, specific, no fluff.

Conversation:
${conversation}`
  } catch { return null }
}

export function applyCompression(modeKey, summary) {
  try {
    const msgs = JSON.parse(localStorage.getItem(`jos-msgs-${modeKey}`) || '[]')
    const kept = msgs.slice(30)

    const summaries = JSON.parse(localStorage.getItem('jos-conversation-summaries') || '{}')
    if (!summaries[modeKey]) summaries[modeKey] = []
    summaries[modeKey].push({
      summary,
      compressedAt: new Date().toISOString(),
      messageCount: 30,
    })
    localStorage.setItem('jos-conversation-summaries', JSON.stringify(summaries))
    localStorage.setItem(`jos-msgs-${modeKey}`, JSON.stringify(kept))
  } catch { /* ok */ }
}

export function getConversationContext(modeKey) {
  try {
    const summaries = JSON.parse(localStorage.getItem('jos-conversation-summaries') || '{}')
    const modeSummaries = summaries[modeKey] || []
    const recentMsgs = JSON.parse(localStorage.getItem(`jos-msgs-${modeKey}`) || '[]')

    let context = ''
    if (modeSummaries.length > 0) {
      context = 'Previous conversation history (compressed):\n'
      context += modeSummaries.map(s => s.summary).join('\n---\n')
      context += '\n\nRecent messages follow:\n'
    }

    return { context, recentMessages: recentMsgs }
  } catch { return { context: '', recentMessages: [] } }
}
