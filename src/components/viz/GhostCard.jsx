// GhostCard.jsx — Semi-transparent card for info JARVIS volunteers without being asked

import { useState, useEffect } from 'react'

export default function GhostCard({ children, id, onDismiss }) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      const tracker = JSON.parse(localStorage.getItem('jos-ghost-engagement') || '{}')
      if (!tracker[id]) tracker[id] = { shown: 0, dismissed: 0, engaged: 0 }
      tracker[id].dismissed++
      localStorage.setItem('jos-ghost-engagement', JSON.stringify(tracker))
    } catch { /* ok */ }
    setTimeout(() => onDismiss?.(), 300)
  }

  if (dismissed) return null

  return (
    <div className={`transition-all duration-300 ${visible ? 'opacity-60 translate-y-0' : 'opacity-0 translate-y-2'}`}
      style={{ background: 'rgba(6,20,34,0.6)', border: '1px solid rgba(0,180,216,0.12)', borderRadius: 8, padding: 12, position: 'relative' }}>
      {visible && <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
        <div style={{ position: 'absolute', top: 0, left: 0, width: '30%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.06), transparent)', animation: 'ghost-scan 0.4s ease-out forwards' }} />
      </div>}
      {children}
      <button onClick={handleDismiss} className="absolute top-2 right-3 font-mono text-[8px] text-text-muted hover:text-cyan">✕</button>
    </div>
  )
}
