// ProactiveSuggestion.jsx — "JARVIS SUGGESTS" card on CMD tab
// WHY: Instead of Nikhil choosing what to do, JARVIS recommends THE ONE
// optimal action based on energy, time, concepts, tasks, meds. One tap to start.

import { useState, useMemo } from 'react'
import { Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { suggestOptimalAction } from '../../utils/proactiveEngine.js'

export default function ProactiveSuggestion({ onAction }) {
  const [showAlts, setShowAlts] = useState(false)
  const suggestion = useMemo(() => suggestOptimalAction(), [])

  if (!suggestion.top) return null

  const handleDoThis = () => {
    if (onAction && suggestion.top.action) {
      onAction(suggestion.top.action)
    }
  }

  return (
    <div className="glass-card p-3 border card-enter" style={{ borderColor: '#00b4d8', borderLeftWidth: 3 }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Zap size={12} className="text-cyan" />
        <span className="font-mono text-[9px] text-cyan tracking-widest">JARVIS SUGGESTS</span>
      </div>

      {/* Main suggestion */}
      <div className="flex items-start gap-2 mb-2">
        <span className="text-lg">{suggestion.top.emoji || '⚡'}</span>
        <div className="flex-1">
          <p className="font-display text-sm font-bold text-text tracking-wider">
            {suggestion.top.label}
          </p>
          <p className="font-body text-[10px] text-text-dim leading-relaxed mt-0.5">
            {suggestion.top.reason}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {suggestion.top.action?.type !== 'rest' && (
          <button
            onClick={handleDoThis}
            className="flex-1 py-1.5 rounded border border-cyan/40 text-cyan font-mono text-[10px] tracking-wider
              hover:bg-cyan/10 transition-all"
          >
            DO THIS
          </button>
        )}
        {suggestion.alternatives.length > 0 && (
          <button
            onClick={() => setShowAlts(!showAlts)}
            className="px-3 py-1.5 rounded border border-border text-text-muted font-mono text-[10px] tracking-wider
              hover:border-cyan/30 hover:text-text transition-all flex items-center gap-1"
          >
            OPTIONS {showAlts ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
        )}
      </div>

      {/* Alternatives */}
      {showAlts && suggestion.alternatives.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border space-y-1.5">
          {suggestion.alternatives.map((alt, i) => (
            <button
              key={i}
              onClick={() => onAction && onAction(alt.action)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded border border-border/50
                hover:border-cyan/30 transition-all text-left"
            >
              <span className="text-sm">{alt.emoji || '▸'}</span>
              <div className="flex-1">
                <p className="font-body text-[10px] text-text-dim">{alt.label}</p>
              </div>
              <span className="font-mono text-[8px] text-text-muted">{alt.score}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
