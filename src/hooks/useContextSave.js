// useContextSave.js — Auto-save session state every 60s, restore on return
// WHY: Bible Section 18. If Nikhil closes the app mid-quiz and returns within
// 30 minutes, he should land right back where he was.
// Session 59D: Expanded to save mode, last task, last note, last message for context recovery.

import { useEffect } from 'react'

const SAVE_KEY = 'jos-context-save'
const SAVE_INTERVAL = 60 * 1000
const STALE_THRESHOLD = 30 * 60 * 1000

export default function useContextSave(activeTab, onRestore) {
  useEffect(() => {
    const save = () => {
      try {
        // Gather rich context for recovery card
        const captures = JSON.parse(localStorage.getItem('jos-quick-capture') || '[]')
        const lastNote = captures.length > 0 ? captures[captures.length - 1].text?.slice(0, 80) : null

        // Find current mode from auto-capture
        const today = new Date().toISOString().split('T')[0]
        const autoCapture = JSON.parse(localStorage.getItem('jos-auto-capture') || '{}')
        const todayModes = (autoCapture[today]?.modes || []).filter(m => !m.endedAt)
        const currentMode = todayModes.length > 0 ? todayModes[todayModes.length - 1].mode : null

        // Last user message from most recent active mode
        let lastMessage = null
        if (currentMode) {
          try {
            const msgs = JSON.parse(localStorage.getItem(`jos-msgs-${currentMode}`) || '[]')
            const userMsgs = msgs.filter(m => m.role === 'user')
            if (userMsgs.length > 0) lastMessage = userMsgs[userMsgs.length - 1].content?.slice(0, 100)
          } catch { /* ok */ }
        }

        const ctx = {
          activeTab,
          currentMode,
          lastNote,
          lastMessage,
          timestamp: new Date().toISOString(),
        }
        localStorage.setItem(SAVE_KEY, JSON.stringify(ctx))
      } catch { /* ok */ }
    }

    save()
    const interval = setInterval(save, SAVE_INTERVAL)
    return () => clearInterval(interval)
  }, [activeTab])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return
      const ctx = JSON.parse(raw)
      if (!ctx.timestamp) return

      const age = Date.now() - new Date(ctx.timestamp).getTime()
      if (age > STALE_THRESHOLD) return

      if (ctx.activeTab && onRestore) onRestore(ctx.activeTab)
    } catch { /* ok */ }
  }, [])
}
