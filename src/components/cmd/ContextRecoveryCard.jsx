// ContextRecoveryCard.jsx — "Where Was I?" card after 10+ min absence
// WHY: ADHD brain needs 20 min to rebuild context. This rebuilds it in 3 seconds.

import { useState, useEffect } from 'react'

export default function ContextRecoveryCard({ onResume, onDismiss }) {
  const [context, setContext] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('jos-context-save')
      if (!raw) return
      const ctx = JSON.parse(raw)
      if (!ctx.timestamp) return

      const gapMinutes = Math.round((Date.now() - new Date(ctx.timestamp).getTime()) / 60000)
      if (gapMinutes < 10 || gapMinutes > 120) return // Only show for 10-120 min gaps

      setContext({ ...ctx, gapMinutes })
      setTimeout(() => setVisible(true), 200)

      // Auto-dismiss after 60s
      const timer = setTimeout(() => onDismiss?.(), 60000)
      return () => clearTimeout(timer)
    } catch { /* ok */ }
  }, [onDismiss])

  if (!context || !visible) return null

  return (
    <div className="glass-card p-4 card-enter" style={{ borderLeft: '3px solid #00b4d8' }}>
      <p className="font-mono text-[9px] text-cyan tracking-widest mb-2">
        WELCOME BACK — {context.gapMinutes} MINUTES AWAY
      </p>
      <div className="space-y-1 mb-3">
        {context.activeTab && (
          <p className="font-body text-xs text-text">→ On <span className="text-cyan font-bold">{context.activeTab.toUpperCase()}</span> tab</p>
        )}
        {context.currentMode && (
          <p className="font-body text-xs text-text">→ In <span className="text-cyan font-bold">{context.currentMode}</span> mode</p>
        )}
        {context.lastNote && (
          <p className="font-body text-xs text-text-dim">→ Last note: "{context.lastNote}"</p>
        )}
        {context.lastMessage && (
          <p className="font-body text-xs text-text-dim">→ Last message: "{context.lastMessage.slice(0, 60)}..."</p>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={() => { onResume?.(context); onDismiss?.() }}
          className="font-mono text-[10px] text-cyan border border-cyan/40 px-3 py-1.5 rounded hover:bg-cyan/10 transition-all">
          RESUME
        </button>
        <button onClick={onDismiss}
          className="font-mono text-[10px] text-text-muted hover:text-text transition-colors">
          DISMISS
        </button>
      </div>
    </div>
  )
}
