// useVizEngine.js — Triggers dashboard overlays based on events
// WHY: ADHD-PI design — zero memory required. JARVIS decides what to show and when.

import { useEffect, useCallback, useState } from 'react'

export default function useVizEngine(eventBus) {
  const [dashboard, setDashboard] = useState(null)

  useEffect(() => {
    // After check-in → show daily delta
    const onCheckin = () => {
      setTimeout(() => setDashboard({ type: 'daily-delta' }), 500)
    }

    // Sunday 7PM → show weekly review
    const now = new Date()
    if (now.getDay() === 0 && now.getHours() >= 19) {
      const shown = sessionStorage.getItem('viz-weekly-shown')
      if (!shown) {
        setDashboard({ type: 'weekly-review' })
        sessionStorage.setItem('viz-weekly-shown', 'true')
      }
    }

    const unsub = eventBus.subscribe('checkin:submit', onCheckin)
    return () => unsub?.()
  }, [eventBus])

  const showDashboard = useCallback((type) => setDashboard({ type }), [])
  const closeDashboard = useCallback(() => setDashboard(null), [])

  return { dashboard, showDashboard, closeDashboard }
}
