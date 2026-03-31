// QuickCapture.jsx — Floating quick thought capture button
// WHY: ADHD brains have fleeting thoughts that vanish in seconds. This floating
// button sits bottom-right, always accessible regardless of active tab. One tap
// opens a text input, enter saves to jos-quick-capture. No friction, no navigation,
// just capture and continue. Thoughts are timestamped for later review.

import { useState } from 'react'
import { Lightbulb, X, Send } from 'lucide-react'
import useStorage from '../hooks/useStorage.js'
import useSound from '../hooks/useSound.js'

export default function QuickCapture() {
  const { update } = useStorage()
  const { play } = useSound()
  const [isOpen, setIsOpen] = useState(false)
  const [text, setText] = useState('')

  const handleSave = () => {
    if (!text.trim()) return

    update('quick-capture', prev => {
      const existing = prev || []
      return [...existing, {
        text: text.trim(),
        timestamp: new Date().toISOString(),
      }]
    })

    play('capture')
    setText('')
    setIsOpen(false)
  }

  // Floating button (collapsed state)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full
          bg-cyan/20 border border-cyan/40 flex items-center justify-center
          hover:bg-cyan/30 hover:border-cyan transition-all duration-200
          animate-breathe"
        style={{ boxShadow: '0 0 12px rgba(0, 180, 216, 0.3)' }}
        aria-label="Quick Capture"
      >
        <Lightbulb size={20} className="text-cyan" />
      </button>
    )
  }

  // Expanded input state
  return (
    <div className="fixed bottom-20 right-4 z-40 w-72">
      <div className="glass-card p-3">
        <div className="hud-panel-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] text-text-dim tracking-widest uppercase">
              Quick Capture
            </span>
            <button
              onClick={() => { setIsOpen(false); setText('') }}
              className="text-text-muted hover:text-text transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Capture a thought..."
              autoFocus
              className="flex-1 bg-void border border-border rounded px-3 py-2
                font-body text-sm text-text placeholder:text-text-muted
                focus:outline-none focus:border-cyan transition-colors duration-200"
            />
            <button
              onClick={handleSave}
              disabled={!text.trim()}
              className={`
                px-2.5 rounded border transition-all duration-200
                ${text.trim()
                  ? 'bg-cyan/10 border-cyan/40 text-cyan hover:bg-cyan/20'
                  : 'bg-card border-border text-text-muted cursor-not-allowed'
                }
              `}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
