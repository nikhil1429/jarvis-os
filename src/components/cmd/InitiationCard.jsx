// InitiationCard.jsx — "The First Physical Step" for task initiation paralysis
// WHY: Starting is harder than doing. Break the first step into something tiny.

import { useState } from 'react'
import { Check } from 'lucide-react'

const MICRO_STEPS = [
  { text: 'Open the terminal.', next: 'Terminal open. Now: cd into the project folder.' },
  { text: 'Open the project folder.', next: 'Now: open one file. Any file. Just look at it.' },
  { text: 'Look at the file.', next: 'Good. Now edit one line. Just one.' },
  { text: "You've started.", next: null },
]

export default function InitiationCard({ onDismiss }) {
  const [step, setStep] = useState(0)
  const current = MICRO_STEPS[step]

  if (!current) {
    setTimeout(() => onDismiss?.(), 2000)
    return (
      <div className="glass-card p-3 card-enter" style={{ borderLeft: '3px solid #10b981' }}>
        <p className="font-body text-xs text-green-400">You're in motion now. The hardest part is done.</p>
      </div>
    )
  }

  return (
    <div className="glass-card p-3 card-enter" style={{ borderLeft: '3px solid #d4a853' }}>
      <p className="font-mono text-[9px] text-gold tracking-wider mb-1">FIRST STEP</p>
      <p className="font-body text-sm text-text leading-relaxed mb-2">{current.text}</p>
      <div className="flex gap-2">
        <button onClick={() => setStep(s => s + 1)}
          className="font-mono text-[9px] text-gold border border-gold/40 px-2 py-1 rounded hover:bg-gold/10 transition-all flex items-center gap-1">
          <Check size={10} /> DONE
        </button>
        <button onClick={onDismiss}
          className="font-mono text-[9px] text-text-muted hover:text-text transition-colors">NOT NOW</button>
      </div>
    </div>
  )
}
