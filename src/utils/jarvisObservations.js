// jarvisObservations.js — Things JARVIS notices and says proactively
// WHY: JARVIS should feel alive — it speaks first, notices what you don't say.
// Runs on boot/CMD tab. Returns array of observations sorted by priority.

export function generateObservations() {
  const observations = []

  try {
    const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
    const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
    const concepts = JSON.parse(localStorage.getItem('jos-concepts') || '[]')
    const capture = JSON.parse(localStorage.getItem('jos-auto-capture') || '{}')
    const msgs = {}
    Object.keys(localStorage).filter(k => k.startsWith('jos-msgs-')).forEach(k => {
      try { msgs[k.replace('jos-msgs-', '')] = JSON.parse(localStorage.getItem(k) || '[]').length } catch { /* ok */ }
    })

    // 1. Mode avoidance detection
    const allModes = ['chat', 'quiz', 'presser', 'timed', 'speed', 'battle', 'teach', 'body-double',
      'alter-ego', 'recruiter-ghost', 'forensics', 'akshay-qs', 'time-machine', 'code-autopsy',
      'scenario-bomb', 'interview-sim', 'impostor-killer', 'weakness-radar']
    const usedModes = Object.keys(msgs).filter(m => msgs[m] > 0)
    const tier3Avoided = allModes.filter(m =>
      ['forensics', 'code-autopsy', 'scenario-bomb', 'weakness-radar', 'time-machine'].includes(m)
    ).filter(m => !usedModes.includes(m))
    if (tier3Avoided.length >= 3 && usedModes.length >= 5) {
      observations.push({
        priority: 2, type: 'avoidance',
        text: `Sir, you've used ${usedModes.length} training modes but avoided all Tier 3 modes: ${tier3Avoided.join(', ')}. The pattern suggests difficulty-avoidance. Shall we try one for just 5 minutes?`
      })
    }

    // 2. Streak at risk
    const lastCheckin = feelings[feelings.length - 1]
    if (lastCheckin) {
      const hoursSince = (Date.now() - new Date(lastCheckin.timestamp || lastCheckin.date).getTime()) / 3600000
      if (hoursSince > 30 && (core.streak || 0) >= 3) {
        observations.push({
          priority: 1, type: 'streak-risk',
          text: `${core.streak}-day streak at risk. Last check-in was ${Math.round(hoursSince)} hours ago. A quick tap is all it takes to keep it alive.`
        })
      }
    }

    // 3. Concept decay
    const decayed = concepts.filter(c => {
      if (!c.lastReviewed || (c.strength || 0) < 30) return false
      const days = (Date.now() - new Date(c.lastReviewed).getTime()) / 86400000
      return days > 14 && (c.strength || 0) >= 50
    })
    if (decayed.length >= 3) {
      observations.push({
        priority: 2, type: 'decay',
        text: `${decayed.length} concepts are decaying without review: ${decayed.slice(0, 3).map(c => c.name).join(', ')}. You built that knowledge — don't let it fade.`
      })
    }

    // 4. Session gap detection
    const dates = Object.keys(capture).sort()
    if (dates.length >= 2) {
      const lastDate = dates[dates.length - 1]
      const daysSince = (Date.now() - new Date(lastDate).getTime()) / 86400000
      if (daysSince >= 3 && daysSince < 14) {
        observations.push({
          priority: 1, type: 'gap',
          text: `${Math.round(daysSince)} days since your last session. No guilt — just noting it. Shall we ease back in with something light?`
        })
      }
    }

    // 5. Flat perfect scores (gaming detection)
    const last5 = feelings.slice(-5)
    if (last5.length >= 5 && last5.every(f => (f.confidence || 0) >= 5 && (f.focus || 0) >= 5)) {
      observations.push({
        priority: 3, type: 'gaming',
        text: `Five consecutive days of perfect scores. Either you've achieved enlightenment, or these numbers aren't reflecting reality. I'd rather have honest 3s than performed 5s, Sir.`
      })
    }

    // 6. Batch task completion detection
    const timestamps = core.taskCompletionTimestamps || []
    if (timestamps.length >= 3) {
      const last3 = timestamps.slice(-3)
      const span = new Date(last3[2]) - new Date(last3[0])
      if (span < 60000) {
        observations.push({
          priority: 3, type: 'batch-marking',
          text: `3 tasks marked complete within a minute. If you're catching up on logging — excellent. If those need actual work, I'd rather we plan them properly.`
        })
      }
    }

    // 7. Message length decay (engagement declining)
    const totalMsgs = Object.values(msgs).reduce((s, n) => s + n, 0)
    if (totalMsgs > 50) {
      const activeModeKey = Object.keys(msgs).sort((a, b) => msgs[b] - msgs[a])[0]
      if (activeModeKey) {
        try {
          const modeMessages = JSON.parse(localStorage.getItem(`jos-msgs-${activeModeKey}`) || '[]')
          const userMsgs = modeMessages.filter(m => m.role === 'user').slice(-10)
          if (userMsgs.length >= 8) {
            const firstHalf = userMsgs.slice(0, 4).reduce((s, m) => s + (m.content?.length || 0), 0) / 4
            const secondHalf = userMsgs.slice(-4).reduce((s, m) => s + (m.content?.length || 0), 0) / 4
            if (firstHalf > 50 && secondHalf < 20) {
              observations.push({
                priority: 3, type: 'engagement-decline',
                text: `Your messages are getting shorter — from ~${Math.round(firstHalf)} to ~${Math.round(secondHalf)} characters. If JARVIS isn't helping with something, I'd rather know than pretend.`
              })
            }
          }
        } catch { /* ok */ }
      }
    }

  } catch (e) { console.error('[Observations]', e) }

  return observations.sort((a, b) => a.priority - b.priority)
}
