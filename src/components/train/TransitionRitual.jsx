// TransitionRitual.jsx — 3-5s mental breath between mode exit and TrainTab
// WHY: ADHD brain needs a moment to close the last mental tab. Short enough to never frustrate.

import { useState, useEffect } from 'react'

export default function TransitionRitual({ mode, duration, messageCount, onComplete }) {
  const [phase, setPhase] = useState('dim') // dim → summary → done

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('summary'), 500)
    const t2 = setTimeout(() => {
      setPhase('done')
      onComplete?.()
    }, 3500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center cursor-pointer"
      style={{ background: 'rgba(2,10,19,0.85)' }}
      onClick={() => { setPhase('done'); onComplete?.() }}>

      {phase === 'dim' && (
        <div className="w-6 h-6 rounded-full" style={{ background: '#00b4d8', opacity: 0.3, animation: 'breathe 2s ease-in-out' }} />
      )}

      {phase === 'summary' && (
        <div className="text-center stagger-enter">
          <p className="font-mono text-xs text-text-muted tracking-widest mb-1">
            {mode?.toUpperCase() || 'SESSION'} · {duration || 0} min · {messageCount || 0} msgs
          </p>
          <div className="w-16 h-px mx-auto mt-3" style={{ background: 'linear-gradient(90deg, transparent, #00b4d8, transparent)' }} />
        </div>
      )}
    </div>
  )
}
