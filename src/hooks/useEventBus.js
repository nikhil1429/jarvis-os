// useEventBus.js — Pub/Sub event bus for cross-component communication
// WHY: JARVIS OS has ~162 features that need to react to each other without
// tight coupling. When a task is completed, the WINS tab needs to check achievements,
// the briefing needs to update, the battle plan needs to recalculate.
// A pub/sub bus lets any component emit events and any other subscribe —
// no prop drilling, no context nesting, no circular imports.
//
// Events: task:complete, checkin:submit, quiz:score, concept:review,
// streak:break, streak:continue, mode:enter, mode:exit, voice:journal,
// achievement:unlock, energy:change, burnout:warning, report:ready

import { useRef, useCallback } from 'react'

// WHY singleton: the bus lives outside React's render cycle so it survives
// re-renders and is shared across all components that call useEventBus().
const listeners = {}

export default function useEventBus() {
  const listenersRef = useRef([])

  const subscribe = useCallback((event, callback) => {
    if (!listeners[event]) listeners[event] = []
    listeners[event].push(callback)
    // Track for cleanup
    listenersRef.current.push({ event, callback })

    // Return unsubscribe function
    return () => {
      listeners[event] = listeners[event].filter(cb => cb !== callback)
    }
  }, [])

  const emit = useCallback((event, data) => {
    if (!listeners[event]) return
    listeners[event].forEach(cb => {
      try {
        cb(data)
      } catch (err) {
        console.error(`[EventBus] Error in listener for ${event}:`, err)
      }
    })
  }, [])

  const unsubscribeAll = useCallback(() => {
    listenersRef.current.forEach(({ event, callback }) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(cb => cb !== callback)
      }
    })
    listenersRef.current = []
  }, [])

  return { subscribe, emit, unsubscribeAll }
}
