// ghostCardEngine.js — Decides what ghost cards to show based on context

import { getMomentumGhostCard } from './momentumTracker.js'

export function generateGhostCards(context) {
  const cards = []
  try {
    // Momentum-based ghost cards (stalling / decelerating detection)
    const momentumCard = getMomentumGhostCard()
    if (momentumCard && context.tab === 'cmd') cards.push(momentumCard)
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

    // Feature 5: Hyperfocus wrong-target detection
    try {
      const plan = JSON.parse(localStorage.getItem('jos-battle-plan') || 'null')
      const capture = JSON.parse(localStorage.getItem('jos-auto-capture') || '{}')
      const today = new Date().toISOString().split('T')[0]
      const todayModes = (capture[today]?.modes || []).filter(m => !m.endedAt)
      if (plan?.date === today && plan?.accepted && todayModes.length > 0) {
        const currentMode = todayModes[todayModes.length - 1]
        const modeMinutes = (Date.now() - new Date(currentMode.startedAt).getTime()) / 60000
        if (modeMinutes >= 45) {
          const planText = (plan.items || []).join(' ').toLowerCase()
          if (!planText.includes(currentMode.mode)) {
            cards.push({ id: 'plan-mismatch', text: `${Math.round(modeMinutes)} min in ${currentMode.mode}. Today's plan says something else. Productive detour, or did hyperfocus hijack the plan?` })
          }
        }
      }
    } catch { /* ok */ }

    // Feature 10: Body state tracking
    const bodyShown = sessionStorage.getItem('jos-body-cards-shown') || '0'
    if (parseInt(bodyShown) < 2) {
      try {
        const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
        const today = new Date().toISOString().split('T')[0]
        const todayCheckin = feelings.find(f => f.date === today)
        const hour = new Date().getHours()

        // No check-in by 3 PM
        if (!todayCheckin && hour >= 15 && context.tab === 'cmd') {
          cards.push({ id: 'no-checkin', text: "No check-in today. Even a quick tap would help, Sir." })
        }

        // 4+ hours since lunch check-in
        if (todayCheckin?.lunch === true && todayCheckin?.timestamp) {
          const hoursSinceLunch = (Date.now() - new Date(todayCheckin.timestamp).getTime()) / 3600000
          if (hoursSinceLunch >= 4 && hour < 22) {
            cards.push({ id: 'hunger', text: "4+ hours since check-in. Medication masks hunger. Your body needs fuel." })
          }
        }

        // 2+ hour continuous session — standing reminder
        const capture = JSON.parse(localStorage.getItem('jos-auto-capture') || '{}')
        const todayTabs = capture[today]?.tabs || []
        if (todayTabs.length > 0) {
          const firstActivity = todayTabs[0].enteredAt
          const sessionHours = (Date.now() - new Date(firstActivity).getTime()) / 3600000
          if (sessionHours >= 2) {
            cards.push({ id: 'standing', text: "2+ hour session. Standing recommended. 90 seconds. Blood flow measurably improves cognitive function." })
          }
        }
      } catch { /* ok */ }
    }

    const engagement = JSON.parse(localStorage.getItem('jos-ghost-engagement') || '{}')
    return cards.filter(card => {
      const stats = engagement[card.id]
      if (!stats) return true
      if (['hunger', 'standing', 'no-checkin'].includes(card.id)) {
        sessionStorage.setItem('jos-body-cards-shown', String(parseInt(bodyShown) + 1))
      }
      return stats.dismissed < (stats.engaged || 0) * 3 + 3
    }).slice(0, 1)
  } catch { return [] }
}
