// useReportScheduler.js — Report scheduling engine + 4-hour pulse generator
// WHY: JARVIS has a 4-tier reporting pipeline (Pulse/Daily/3-Day/Weekly).
// Phase 6: The 4-hour pulse is now REAL — pure JavaScript, no API call.
// It checks session hours, tasks completed, and energy to generate a 2-3 line
// status text. Pulses auto-replace on next cycle. Also tracks report scheduling.

import { useState, useEffect, useCallback } from 'react'
import useStorage from './useStorage.js'
import TASKS from '../data/tasks.js'

/**
 * generatePulse — Pure JS pulse text generation (NO API call, $0.00)
 * WHY: The 4-hour pulse is ambient awareness, not deep analysis.
 * Simple data checks produce actionable 2-3 line status.
 */
function generatePulse(sessionHours, tasksDoneSinceLastPulse, totalTasksDone, totalTasks, energy) {
  const completionPct = Math.round((totalTasksDone / totalTasks) * 100)
  const hrs = Math.round(sessionHours)

  let line1 = `${hrs}h in session.`
  let line2 = ''
  let line3 = ''

  if (tasksDoneSinceLastPulse === 0) {
    line2 = 'No tasks completed since last pulse.'
    if (energy <= 2) {
      line3 = 'Energy low. Consider a break or Body Double session.'
    } else {
      line3 = 'Consider switching to a lighter training mode.'
    }
  } else if (tasksDoneSinceLastPulse >= 3) {
    line2 = `${tasksDoneSinceLastPulse} tasks completed. Strong pace.`
    line3 = `Overall: ${completionPct}% complete.`
  } else {
    line2 = `${tasksDoneSinceLastPulse} task${tasksDoneSinceLastPulse > 1 ? 's' : ''} done.`
    if (energy >= 4) {
      line3 = `Energy high. Push for more. ${completionPct}% overall.`
    } else if (energy <= 2) {
      line3 = `Energy dropped to ${energy}. Consider a break.`
    } else {
      line3 = `Steady pace. ${completionPct}% overall.`
    }
  }

  // Late night warning override
  const hour = new Date().getHours()
  if (hour >= 23 || hour < 4) {
    line3 = 'Late night detected. Bug rate rises after midnight, Sir.'
  }

  return [line1, line2, line3].filter(Boolean).join(' ')
}

export default function useReportScheduler() {
  const { get, update } = useStorage()
  const [pulse, setPulse] = useState(null)
  const [pulseDismissed, setPulseDismissed] = useState(false)

  // Generate pulse check
  const checkPulse = useCallback(() => {
    const weekly = get('weekly') || {}
    const lastPulse = typeof weekly === 'object' && !Array.isArray(weekly)
      ? weekly.lastPulse
      : null

    const now = Date.now()
    const fourHours = 4 * 60 * 60 * 1000

    if (lastPulse && (now - new Date(lastPulse).getTime()) < fourHours) {
      // Not due yet — but load existing pulse if any
      if (typeof weekly === 'object' && weekly.currentPulse) {
        setPulse(weekly.currentPulse)
      }
      return
    }

    // Generate pulse
    const core = get('core') || {}
    const sessionTimer = get('session-timer') || {}
    const sessionHours = (sessionTimer.totalMinutes || 0) / 60
    const completedTasks = core.completedTasks || []
    const lastPulseTaskCount = typeof weekly === 'object' ? (weekly.lastPulseTaskCount || 0) : 0
    const tasksDoneSince = completedTasks.length - lastPulseTaskCount
    const energy = core.energy || 3

    const pulseText = generatePulse(sessionHours, tasksDoneSince, completedTasks.length, TASKS.length, energy)

    const pulseEntry = {
      text: pulseText,
      timestamp: new Date().toISOString(),
    }

    setPulse(pulseEntry)
    setPulseDismissed(false)

    // Save pulse state
    update('weekly', prev => {
      const existing = (typeof prev === 'object' && !Array.isArray(prev)) ? prev : {}
      return {
        ...existing,
        lastPulse: new Date().toISOString(),
        lastPulseTaskCount: completedTasks.length,
        currentPulse: pulseEntry,
      }
    })

    console.log('[ReportScheduler] Pulse generated:', pulseText)
  }, [get, update])

  const dismissPulse = useCallback(() => {
    setPulseDismissed(true)
  }, [])

  // Run on mount and set up interval for periodic checks
  useEffect(() => {
    checkPulse()

    // Check every 30 minutes if a pulse is due
    const interval = setInterval(checkPulse, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [checkPulse])

  // Also run the general report scheduling on mount
  useEffect(() => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const hour = now.getHours()
    const dayOfWeek = now.getDay()

    const weekly = get('weekly') || {}
    const feelings = get('feelings') || []
    const dueReports = []

    // TIER 2: Daily Debrief (after check-in OR 9 PM)
    const isWeeklyObj = typeof weekly === 'object' && !Array.isArray(weekly)
    const todayCheckin = feelings.find(f => f.date === today)
    const lastDebrief = isWeeklyObj ? weekly.lastDebrief : null
    const debriefDoneToday = lastDebrief && lastDebrief.startsWith(today)
    if (!debriefDoneToday && (todayCheckin || hour >= 21)) {
      dueReports.push({ tier: 2, name: 'Daily Debrief', cost: 0.10, priority: 'P3' })
    }

    // TIER 3: 3-Day Trend (every 3rd day, evening 6-9 PM)
    const lastTrend = isWeeklyObj ? weekly.lastTrend : null
    const daysSinceTrend = lastTrend
      ? Math.floor((Date.now() - new Date(lastTrend).getTime()) / (1000 * 60 * 60 * 24))
      : 999
    if (daysSinceTrend >= 3 && hour >= 18 && hour <= 21) {
      dueReports.push({ tier: 3, name: '3-Day Trend', cost: 1.25, priority: 'P2' })
    }

    // TIER 4: Weekly Strategic Review (Sunday after 7 PM)
    const lastWeekly = isWeeklyObj ? weekly.lastWeeklyReview : null
    const weeklyDoneThisWeek = lastWeekly && (() => {
      const lastDate = new Date(lastWeekly)
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - dayOfWeek)
      startOfWeek.setHours(0, 0, 0, 0)
      return lastDate >= startOfWeek
    })()
    if (dayOfWeek === 0 && hour >= 19 && !weeklyDoneThisWeek) {
      dueReports.push({ tier: 4, name: 'Weekly Strategic Review', cost: 1.25, priority: 'P1' })
    }

    if (dueReports.length > 0) {
      console.log('[ReportScheduler] Reports due:', dueReports.map(r => `${r.name} (T${r.tier})`).join(', '))
    }

    update('weekly', prev => {
      const existing = (typeof prev === 'object' && !Array.isArray(prev)) ? prev : {}
      return {
        ...existing,
        lastScheduleCheck: now.toISOString(),
        dueReports,
      }
    })
  }, [get, update])

  return {
    pulse: pulseDismissed ? null : pulse,
    dismissPulse,
  }
}
