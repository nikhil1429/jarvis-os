// useNotifications.js — Browser push notifications for key JARVIS events
// WHY: Nudge Nikhil when streak is at risk, check-in pending, or concept overdue.
// Max 4/day. Requests permission on first boot. Gracefully handles denied.

import { useEffect, useRef } from 'react'
import { getReviewSchedule } from '../utils/spacedRepetition.js'
import CONCEPTS from '../data/concepts.js'

const MAX_PER_DAY = 4

function getSentToday() {
  try { return JSON.parse(sessionStorage.getItem('jos-notif-sent') || '[]') } catch { return [] }
}
function markSent(id) {
  const sent = getSentToday()
  sent.push(id)
  sessionStorage.setItem('jos-notif-sent', JSON.stringify(sent))
}
function canSend(id) {
  const sent = getSentToday()
  return sent.length < MAX_PER_DAY && !sent.includes(id)
}

function fireNotification(id, title, body) {
  if (Notification.permission !== 'granted' || !canSend(id)) return
  try {
    new Notification(title, { body, icon: '/favicon.svg' })
    markSent(id)
    console.log('NOTIFICATION:', id, '-', body)
  } catch { /* ok */ }
}

function runChecks() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

  const hour = new Date().getHours()
  const today = new Date().toISOString().split('T')[0]

  try {
    const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
    const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
    const concepts = JSON.parse(localStorage.getItem('jos-concepts') || '[]')

    // 1. Morning briefing reminder (9 AM, no session today)
    if (hour >= 9 && hour < 12) {
      const lastSession = localStorage.getItem('jos-session-timer')
      const sessionToday = lastSession && JSON.parse(lastSession)?.date === today
      if (!sessionToday) {
        fireNotification('morning', 'JARVIS OS', 'Good morning, Sir. JARVIS OS awaits your briefing.')
      }
    }

    // 2. Evening check-in reminder (9 PM, no check-in today)
    if (hour >= 21 && hour < 23) {
      const checkinToday = feelings.some(f => (f.date || f.timestamp?.split('T')[0]) === today)
      if (!checkinToday) {
        fireNotification('checkin', 'JARVIS OS', 'Evening, Sir. Daily debrief pending.')
      }
    }

    // 3. Streak at risk (8 PM+, no session today)
    if (hour >= 20 && (core.streak || 0) > 0) {
      const lastSession = localStorage.getItem('jos-session-timer')
      const sessionToday = lastSession && JSON.parse(lastSession)?.date === today
      if (!sessionToday) {
        fireNotification('streak', 'JARVIS OS', `Sir, your ${core.streak}-day streak is at risk.`)
      }
    }

    // 4. Concept review due (any concept overdue 3+ days)
    const overdue = CONCEPTS.map(c => {
      const saved = concepts.find(s => s.id === c.id) || {}
      const schedule = getReviewSchedule(saved)
      return { name: c.name, ...schedule }
    }).find(c => c.isOverdue && c.daysOverdue >= 3)

    if (overdue) {
      fireNotification('concept', 'JARVIS OS', `Sir, ${overdue.name} is overdue for review.`)
    }
  } catch { /* ok */ }
}

export default function useNotifications() {
  const intervalRef = useRef(null)

  useEffect(() => {
    // Request permission on first boot
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        console.log('NOTIFICATIONS: permission', p)
      })
    }

    // Run checks now and every 2 hours
    runChecks()
    intervalRef.current = setInterval(runChecks, 2 * 60 * 60 * 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])
}
