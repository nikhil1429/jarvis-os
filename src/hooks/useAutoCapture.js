// useAutoCapture.js — Passive activity tracking
// WHY: Silently captures task completions, mode sessions, tab visits, captures.
// Stores in jos-auto-capture keyed by date. Zero effort from Nikhil.

import { useEffect, useCallback } from 'react'
import useEventBus from './useEventBus.js'

export default function useAutoCapture() {
  const eventBus = useEventBus()
  const today = new Date().toISOString().split('T')[0]

  const capture = useCallback((type, data) => {
    try {
      const key = 'jos-auto-capture'
      const all = JSON.parse(localStorage.getItem(key) || '{}')
      if (!all[today]) all[today] = { tasks: [], modes: [], tabs: [], captures: [], events: [] }

      switch (type) {
        case 'task':
          all[today].tasks.push({ ...data, at: new Date().toISOString() })
          break
        case 'mode-enter':
          all[today].modes.push({ mode: data.mode, startedAt: new Date().toISOString() })
          break
        case 'mode-exit': {
          const lastMode = [...(all[today].modes || [])].reverse().find(m => m.mode === data.mode && !m.endedAt)
          if (lastMode) {
            lastMode.endedAt = new Date().toISOString()
            lastMode.messageCount = data.messageCount || 0
          }
          break
        }
        case 'tab': {
          const lastTab = all[today].tabs[all[today].tabs.length - 1]
          if (lastTab && !lastTab.leftAt) lastTab.leftAt = new Date().toISOString()
          all[today].tabs.push({ tab: data.tab, enteredAt: new Date().toISOString() })
          break
        }
        case 'capture':
          all[today].captures.push({ text: data.text, at: new Date().toISOString() })
          break
        case 'event':
          all[today].events.push({ type: data.type, detail: data.detail, at: new Date().toISOString() })
          break
      }

      localStorage.setItem(key, JSON.stringify(all))
      window.dispatchEvent(new Event('jarvis-data-updated'))
    } catch (e) { console.error('[AutoCapture]', e) }
  }, [today])

  useEffect(() => {
    const unsubs = [
      eventBus.subscribe('task:complete', (data) => capture('task', data)),
      eventBus.subscribe('mode:enter', (data) => capture('mode-enter', data)),
      eventBus.subscribe('mode:exit', (data) => capture('mode-exit', data)),
      eventBus.subscribe('checkin:submit', () => capture('event', { type: 'checkin', detail: 'submitted' })),
      eventBus.subscribe('achievement:unlock', (data) => capture('event', { type: 'achievement', detail: data?.id })),
      eventBus.subscribe('voice:journal', () => capture('event', { type: 'journal', detail: 'recorded' })),
    ]
    return () => unsubs.forEach(fn => fn && fn())
  }, [eventBus, capture])

  const captureTab = useCallback((tab) => capture('tab', { tab }), [capture])

  return { capture, captureTab }
}

export function getDaySummary() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const data = JSON.parse(localStorage.getItem('jos-auto-capture') || '{}')[today]
    if (!data) return null

    const tasksCompleted = data.tasks?.length || 0
    const totalModeMinutes = (data.modes || []).reduce((sum, m) => {
      if (!m.endedAt) return sum
      return sum + (new Date(m.endedAt) - new Date(m.startedAt)) / 60000
    }, 0)
    const modesUsed = [...new Set((data.modes || []).map(m => m.mode))]
    const totalMessages = (data.modes || []).reduce((sum, m) => sum + (m.messageCount || 0), 0)
    const captureCount = data.captures?.length || 0

    const allTimes = [
      ...(data.tasks || []).map(t => t.at),
      ...(data.modes || []).map(m => m.startedAt),
      ...(data.tabs || []).map(t => t.enteredAt),
    ].filter(Boolean).sort()

    const sessionHours = allTimes.length >= 2
      ? ((new Date(allTimes[allTimes.length - 1]) - new Date(allTimes[0])) / 3600000).toFixed(1)
      : 0

    return { tasksCompleted, totalModeMinutes: Math.round(totalModeMinutes), modesUsed, totalMessages, captureCount, sessionHours }
  } catch { return null }
}
