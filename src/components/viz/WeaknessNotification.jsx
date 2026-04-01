// WeaknessNotification.jsx — Pulsing notification when weakness detected
import { X } from 'lucide-react'
import VizConceptRing from './VizConceptRing.jsx'

export default function WeaknessNotification({ weakness, onTap, onDismiss }) {
  if (!weakness) return null
  return (
    <div className="glass-card card-enter" style={{ padding: 12, borderLeft: '3px solid #d4a853', marginBottom: 12, cursor: 'pointer' }} onClick={onTap}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#d4a853' }} />
          <span className="font-display text-[10px] font-bold tracking-wider gold-heading" style={{ color: '#d4a853' }}>ROOT CAUSE DETECTED</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDismiss() }} style={{ color: '#5a7a94' }}><X size={14} /></button>
      </div>
      <p className="font-body text-xs text-text-dim mb-2">Sir, I've traced your {weakness.concept} struggles to a foundational gap.</p>
      <div className="flex items-center gap-3">
        <VizConceptRing name={weakness.concept} strength={50} size={32} showLabel={false} />
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#5a7a94' }}>→ → →</span>
        <VizConceptRing name={weakness.rootCause} strength={weakness.rootCauseStrength} size={32} showLabel={false} />
        <span className="font-mono text-[9px]" style={{ color: '#ef4444' }}>{weakness.rootCause} ({weakness.rootCauseStrength}%)</span>
      </div>
      <p className="font-mono text-[8px] text-gold/50 mt-2 tracking-wider">TAP TO DIAGNOSE</p>
    </div>
  )
}
