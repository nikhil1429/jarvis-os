// jarvisAgenda.js — Things JARVIS decides to investigate on its own

export function generateInvestigations() {
  const investigations = []
  try {
    const concepts = JSON.parse(localStorage.getItem('jos-concepts') || '[]')
    const msgs = {}
    Object.keys(localStorage).filter(k => k.startsWith('jos-msgs-')).forEach(k => {
      try { msgs[k.replace('jos-msgs-', '')] = JSON.parse(localStorage.getItem(k) || '[]') } catch { /* ok */ }
    })

    const presserMsgs = msgs['presser'] || []
    const chatMsgs = msgs['chat'] || []
    if (presserMsgs.length >= 10 && chatMsgs.length >= 10) {
      const presserAvg = presserMsgs.filter(m => m.role === 'user').reduce((s, m) => s + (m.content?.length || 0), 0) / Math.max(1, presserMsgs.filter(m => m.role === 'user').length)
      const chatAvg = chatMsgs.filter(m => m.role === 'user').reduce((s, m) => s + (m.content?.length || 0), 0) / Math.max(1, chatMsgs.filter(m => m.role === 'user').length)
      if (chatAvg > presserAvg * 2.5) {
        investigations.push({
          id: 'presser-compression', opener: "I've been thinking about something, Sir.",
          text: `Your Presser answers average ${Math.round(presserAvg)} characters. Chat: ${Math.round(chatAvg)}. Pressure is compressing your responses below demonstration threshold.`,
          action: { label: 'PRACTICE NOW', mode: 'presser' },
        })
      }
    }

    const weakConcepts = concepts.filter(c => (c.strength || 0) < 40)
    const unusedHardModes = ['code-autopsy', 'scenario-bomb', 'forensics'].filter(m => !(msgs[m]?.length > 0))
    if (unusedHardModes.length > 0 && weakConcepts.length >= 3) {
      investigations.push({
        id: 'mode-unlock', opener: "A hypothesis I'd like to test.",
        text: `${unusedHardModes[0].replace(/-/g, ' ')} may unlock ${weakConcepts.length} weak concepts. You haven't tried it yet.`,
        action: { label: "LET'S TEST IT", mode: unusedHardModes[0] },
      })
    }

    const apiLogs = JSON.parse(localStorage.getItem('jos-api-logs') || '[]')
    if (apiLogs.length >= 50) {
      investigations.push({
        id: 'session-length', opener: "I've been analyzing your session patterns.",
        text: 'Your most productive sessions are between 45-90 minutes. Shorter sessions lack depth. Longer sessions show declining response quality.',
        action: null,
      })
    }

    return investigations.slice(0, 2)
  } catch { return [] }
}
