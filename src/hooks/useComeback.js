// useComeback.js — Gentle re-engagement after absence
// WHY: Bible Section 23. No guilt. Ever. Warm welcome back with reduced targets.

import { useEffect, useMemo } from 'react'

export default function useComeback() {
  // Save today as last session date

  // Set comeback mode in core if needed

  const comebackState = useMemo(() => {
    try {
      const last = localStorage.getItem('jos-last-session-date')
      if (!last) return { type: 'first', daysSince: 0 }
      const today = new Date()
      const lastDate = new Date(last)
      const diff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24))

      if (diff <= 1) return { type: 'normal', daysSince: diff }
      if (diff <= 3) return {
        type: 'gentle', daysSince: diff,
        message: `Welcome back, Sir. ${diff} days away. Streak reset to 1. Let's start with something light.`,
      }
      if (diff <= 7) return {
        type: 'moderate', daysSince: diff, reducedTargets: true,
        message: `Sir. ${diff} days. No judgement — life happens. I've reduced your targets for 3 days. Ease back in.`,
      }
      return {
        type: 'extended', daysSince: diff, reducedTargets: true, reducedDays: 3,
        message: `Sir. It's been ${diff} days. I'm genuinely glad you're back. We'll start fresh — reduced targets, no pressure. The data is still here. YOU are still here. That's what matters.`,
      }
    } catch { return { type: 'normal', daysSince: 0 } }
  }, [])

  useEffect(() => {
    localStorage.setItem('jos-last-session-date', new Date().toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (comebackState.reducedTargets) {
      try {
        const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
        core.comebackMode = { active: true, startDate: new Date().toISOString(), reducedDays: comebackState.reducedDays || 3 }
        localStorage.setItem('jos-core', JSON.stringify(core))
      } catch { /* ok */ }
    }
  }, [comebackState])


  return comebackState
}
