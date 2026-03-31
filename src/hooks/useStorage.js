// useStorage.js — localStorage wrapper with jos- prefix and corruption protection
// WHY: Every localStorage read can fail (corrupted JSON, quota exceeded, private browsing).
// This hook wraps ALL access in try-catch so one bad key can't crash the app.
// The 'jos-' prefix namespaces our data so it never collides with other apps on the same domain.

import { useCallback } from 'react'

const PREFIX = 'jos-'

export default function useStorage() {
  // WHY useCallback: these functions get passed as props — stable references prevent re-renders
  const get = useCallback((key) => {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (raw === null) return null
      return JSON.parse(raw)
    } catch (err) {
      console.error(`[useStorage] Failed to read ${PREFIX}${key}:`, err)
      return null
    }
  }, [])

  const set = useCallback((key, value) => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch (err) {
      console.error(`[useStorage] Failed to write ${PREFIX}${key}:`, err)
    }
  }, [])

  // WHY updater pattern: read-modify-write in one call prevents race conditions
  // and keeps calling code clean (e.g., update('core', prev => ({ ...prev, streak: prev.streak + 1 })))
  const update = useCallback((key, updater) => {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      const current = raw ? JSON.parse(raw) : null
      const next = updater(current)
      localStorage.setItem(PREFIX + key, JSON.stringify(next))
      return next
    } catch (err) {
      console.error(`[useStorage] Failed to update ${PREFIX}${key}:`, err)
      return null
    }
  }, [])

  const remove = useCallback((key) => {
    try {
      localStorage.removeItem(PREFIX + key)
    } catch (err) {
      console.error(`[useStorage] Failed to remove ${PREFIX}${key}:`, err)
    }
  }, [])

  return { get, set, update, remove }
}
