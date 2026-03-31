// useContextSave.js — Auto-save session state every 60s, restore on return
// WHY: Bible Section 18. If Nikhil closes the app mid-quiz and returns within
// 30 minutes, he should land right back where he was.

import { useEffect, useCallback } from 'react'

const SAVE_KEY = 'jos-context-save'
const SAVE_INTERVAL = 60 * 1000 // 60 seconds
const STALE_THRESHOLD = 30 * 60 * 1000 // 30 minutes

export default function useContextSave(activeTab, onRestore) {
  // Save context every 60 seconds
  useEffect(() => {
    const save = () => {
      try {
        const ctx = {
          activeTab,
          timestamp: new Date().toISOString(),
        }
        localStorage.setItem(SAVE_KEY, JSON.stringify(ctx))
      } catch { /* ok */ }
    }

    save() // save immediately
    const interval = setInterval(save, SAVE_INTERVAL)
    return () => clearInterval(interval)
  }, [activeTab])

  // Restore on mount (once)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return
      const ctx = JSON.parse(raw)
      if (!ctx.timestamp) return

      const age = Date.now() - new Date(ctx.timestamp).getTime()
      if (age > STALE_THRESHOLD) {
        console.log('CONTEXT: stale (' + Math.round(age / 60000) + 'min), ignoring')
        return
      }

      console.log('CONTEXT: restoring tab:', ctx.activeTab, '(' + Math.round(age / 1000) + 's old)')
      if (ctx.activeTab && onRestore) {
        onRestore(ctx.activeTab)
      }
    } catch { /* ok */ }
  }, []) // only on mount
}
