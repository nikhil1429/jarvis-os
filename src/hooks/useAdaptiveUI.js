// useAdaptiveUI.js — CMD layout adapts to time of day + energy level
// WHY: Bible Section 19. Morning = hard tasks, evening = review/journal,
// low energy = easy wins. Suggestions help Nikhil pick the right activity.

import { useMemo } from 'react'
import { getReviewSchedule } from '../utils/spacedRepetition.js'
import CONCEPTS from '../data/concepts.js'

function getTimeContext() {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return { period: 'morning', label: 'Peak focus window', suggestion: 'hard tasks' }
  if (h >= 12 && h < 17) return { period: 'afternoon', label: 'Post-lunch zone', suggestion: 'body double, lighter modes' }
  if (h >= 17 && h < 21) return { period: 'evening', label: 'Wind-down', suggestion: 'review, check-in, journal' }
  return { period: 'latenight', label: 'Rest recommended', suggestion: 'sleep' }
}

function getEnergyContext(energy) {
  if (energy <= 2) return { level: 'low', label: 'Low energy mode', suggestion: 'easy wins' }
  if (energy >= 4) return { level: 'high', label: 'High energy mode', suggestion: 'hard modes, deep work' }
  return { level: 'normal', label: 'Normal mode', suggestion: 'standard' }
}

export default function useAdaptiveUI() {
  const suggestions = useMemo(() => {
    const items = []
    const time = getTimeContext()
    let energy = 3
    try { energy = JSON.parse(localStorage.getItem('jos-core') || '{}').energy || 3 } catch { /* ok */ }
    const energyCtx = getEnergyContext(energy)

    // Onboarding peak hours check
    let peakNow = false
    try {
      const onboarding = JSON.parse(localStorage.getItem('jos-onboarding') || '{}')
      const peak = onboarding.energy?.peakHours?.toLowerCase() || ''
      const h = new Date().getHours()
      if ((peak.includes('morning') && h >= 6 && h < 12) || (peak.includes('evening') && h >= 17 && h < 21)) {
        peakNow = true
      }
    } catch { /* ok */ }

    // Time-based suggestions
    if (time.period === 'morning' || peakNow) {
      if (energyCtx.level === 'high') {
        items.push({ text: 'Peak energy + peak hours — try Quiz on weak concepts', action: 'quiz', priority: 'high' })
      } else {
        items.push({ text: 'Morning focus window — tackle hard tasks first', action: 'tasks', priority: 'medium' })
      }
    }
    if (time.period === 'afternoon' && energyCtx.level === 'low') {
      items.push({ text: 'Low energy afternoon — try Body Double for gentle focus', action: 'body-double', priority: 'medium' })
    }
    if (time.period === 'evening') {
      items.push({ text: 'Evening wind-down — complete your daily check-in', action: 'checkin', priority: 'medium' })
    }
    if (time.period === 'latenight') {
      items.push({ text: 'Past 9 PM — consider resting, Sir. Tomorrow needs you sharp.', action: 'rest', priority: 'high' })
    }

    // Overdue concept check
    try {
      const saved = JSON.parse(localStorage.getItem('jos-concepts') || '[]')
      const overdue = CONCEPTS.map(c => {
        const s = saved.find(x => x.id === c.id) || {}
        const schedule = getReviewSchedule(s)
        return { name: c.name, ...schedule }
      }).filter(c => c.isOverdue && c.daysOverdue >= 2).sort((a, b) => b.daysOverdue - a.daysOverdue)

      if (overdue.length > 0) {
        items.push({
          text: `${overdue[0].name} is ${overdue[0].daysOverdue}d overdue for review`,
          action: 'concept-review',
          priority: overdue[0].daysOverdue >= 5 ? 'high' : 'medium',
        })
      }
    } catch { /* ok */ }

    // Check-in done today?
    try {
      const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
      const today = new Date().toISOString().split('T')[0]
      const done = feelings.some(f => (f.date || f.timestamp?.split('T')[0]) === today)
      if (!done && time.period !== 'morning') {
        items.push({ text: 'Daily check-in not completed yet', action: 'checkin', priority: 'medium' })
      }
    } catch { /* ok */ }

    return items.slice(0, 3)
  }, [])

  return {
    timeContext: getTimeContext(),
    energyContext: getEnergyContext(
      (() => { try { return JSON.parse(localStorage.getItem('jos-core') || '{}').energy || 3 } catch { return 3 } })()
    ),
    suggestions,
  }
}
