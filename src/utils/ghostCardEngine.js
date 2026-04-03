// ghostCardEngine.js — Decides what ghost cards to show based on context

export function generateGhostCards(context) {
  const cards = []
  try {
    const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
    const completed = core.completedTasks || []
    const concepts = JSON.parse(localStorage.getItem('jos-concepts') || '[]')

    if (context.event === 'task-complete') {
      const remaining = 82 - completed.length
      const dayNumber = core.dayNumber || 1
      const tasksPerDay = completed.length / Math.max(1, dayNumber)
      const daysToComplete = remaining / Math.max(0.1, tasksPerDay)
      const completionDate = new Date(Date.now() + daysToComplete * 86400000).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })
      cards.push({ id: 'velocity', text: `${remaining} remaining. At current velocity: complete by ${completionDate}.` })
    }

    if (context.event === 'mode-exit' && context.mode) {
      try {
        const msgs = JSON.parse(localStorage.getItem(`jos-msgs-${context.mode}`) || '[]')
        if (msgs.length >= 10) {
          cards.push({ id: 'training-trend', text: `${msgs.length} messages in ${context.mode}. Engagement depth building.` })
        }
      } catch { /* ok */ }
    }

    const decaying = concepts.filter(c => {
      if (!c.lastReviewed) return false
      return (Date.now() - new Date(c.lastReviewed).getTime()) / 86400000 > 7 && (c.strength || 0) >= 50
    })
    if (decaying.length > 0 && context.tab === 'cmd') {
      cards.push({ id: 'concept-decay', text: `${decaying[0].name} at ${decaying[0].strength}% and decaying. 10-minute quiz resets the clock.` })
    }

    const engagement = JSON.parse(localStorage.getItem('jos-ghost-engagement') || '{}')
    return cards.filter(card => {
      const stats = engagement[card.id]
      if (!stats) return true
      return stats.dismissed < (stats.engaged || 0) * 3 + 3
    }).slice(0, 1)
  } catch { return [] }
}
