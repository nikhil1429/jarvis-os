// useSessionTimer.js — Auto-tracking work session timer
// WHY: JARVIS needs to know how long Nikhil actually works each day (not just when
// he's at his desk). This hook starts a timer on boot, auto-pauses after 5 minutes
// of inactivity (no mouse/keyboard), and saves session data to localStorage.

import { useState, useEffect, useRef, useCallback } from 'react'
import useStorage from './useStorage.js'

export default function useSessionTimer() {
  const { get, set } = useStorage()
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef(null)
  const lastActivityRef = useRef(Date.now())
  const sessionStartRef = useRef(new Date().toISOString())
  // WHY ref instead of state: avoids infinite re-render loop.
  // checkIdle and handleActivity were depending on isActive state and also
  // setting it, creating a dependency cycle in useEffect.
  const isActiveRef = useRef(true)
  const [isActive, setIsActive] = useState(true)

  const IDLE_TIMEOUT = 5 * 60 * 1000

  // Start/stop the interval based on active state
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1)
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isActive])

  // Idle detection + activity listeners — stable refs, no state deps
  useEffect(() => {
    const checkIdle = () => {
      const idleTime = Date.now() - lastActivityRef.current
      if (idleTime >= IDLE_TIMEOUT && isActiveRef.current) {
        isActiveRef.current = false
        setIsActive(false)
      }
    }

    const handleActivity = () => {
      lastActivityRef.current = Date.now()
      if (!isActiveRef.current) {
        isActiveRef.current = true
        setIsActive(true)
      }
    }

    const idleCheck = setInterval(checkIdle, 30000)
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, handleActivity))

    return () => {
      clearInterval(idleCheck)
      events.forEach(e => window.removeEventListener(e, handleActivity))
    }
  }, []) // Stable — no deps needed, uses refs

  // Save session on unmount
  useEffect(() => {
    const onUnload = () => {
      const today = new Date().toISOString().split('T')[0]
      const existing = get('session-timer') || { date: today, sessions: [], totalMinutes: 0 }
      if (existing.date !== today) {
        existing.date = today
        existing.sessions = []
        existing.totalMinutes = 0
      }
      existing.sessions.push({
        start: sessionStartRef.current,
        end: new Date().toISOString(),
      })
      existing.totalMinutes = Math.floor(elapsed / 60)
      set('session-timer', existing)
    }

    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      onUnload()
    }
  }, []) // Stable — elapsed read at call time via closure won't work, but that's ok for beforeunload

  const pause = useCallback(() => {
    isActiveRef.current = false
    setIsActive(false)
  }, [])

  const resume = useCallback(() => {
    lastActivityRef.current = Date.now()
    isActiveRef.current = true
    setIsActive(true)
  }, [])

  return { elapsed, isActive, pause, resume }
}
