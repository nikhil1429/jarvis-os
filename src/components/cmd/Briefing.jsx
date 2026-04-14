// Briefing.jsx — Displays the morning briefing persistently on CMD tab
// WHY: Boot briefing disappears after entering the app. This card shows it
// on the CMD tab so Nikhil can re-read or replay it anytime.

import { Volume2 } from 'lucide-react'
import useStorage from '../../hooks/useStorage.js'
import renderMd from '../../utils/renderMd.js'
import { getLastSession, generateContinuityBriefing } from '../../utils/sessionContinuity.js'

export default function Briefing() {
  const { get } = useStorage()
  const weekly = get('weekly') || {}
  const today = new Date().toISOString().split('T')[0]

  // Look for today's briefing in weekly data
  const briefing = weekly.briefing || weekly.lastBriefing

  const handleReplay = async () => {
    if (!briefing?.text) return
    try {
      const synth = window.speechSynthesis
      if (!synth) return
      synth.cancel()
      const u = new SpeechSynthesisUtterance(briefing.text)
      u.lang = 'en-GB'
      u.rate = 0.95
      const voices = synth.getVoices()
      const brit = voices.find(v => v.lang === 'en-GB') || voices[0]
      if (brit) u.voice = brit
      synth.speak(u)
    } catch { /* ok */ }
  }

  if (!briefing?.text) {
    return (
      <div className="glass-card p-3 border border-border mb-4"
        style={{ borderLeft: '3px solid #0d2137' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-xs font-bold text-text-dim tracking-wider">MORNING BRIEFING</p>
            <p className="font-body text-[11px] text-text-muted mt-1">
              Complete the boot sequence to generate today's briefing.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-3 border mb-4"
      style={{ borderColor: '#00b4d8', borderLeftWidth: 3 }}>
      <div className="shimmer-inner" />
      <div className="hud-panel-inner" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex items-center justify-between mb-2">
          <p className="font-display text-xs font-bold text-cyan tracking-wider">MORNING BRIEFING</p>
          <div className="flex gap-1.5">
            <button onClick={handleReplay}
              className="p-1.5 rounded border border-border text-text-muted hover:border-cyan/40 hover:text-cyan transition-all"
              title="Replay briefing">
              <Volume2 size={14} />
            </button>
            <button onClick={() => { try { window.speechSynthesis?.cancel() } catch {} }}
              className="p-1.5 rounded border border-border text-text-muted hover:border-red-500/40 hover:text-red-400 transition-all"
              title="Stop speaking">
              <span style={{ fontSize: 12, fontFamily: 'Share Tech Mono' }}>■</span>
            </button>
          </div>
        </div>
        {(() => {
          const last = getLastSession()
          const continuity = last ? generateContinuityBriefing(last) : ''
          if (!continuity) return null
          return (
            <p className="font-body text-[10px] text-text-dim leading-relaxed mb-2 pb-2 border-b border-border/30 italic">
              {continuity}
            </p>
          )
        })()}
        <div className="font-body text-xs text-text leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMd(briefing.text) }} />
        {briefing.generatedAt && (
          <p className="font-mono text-[8px] text-text-muted mt-1.5">
            {new Date(briefing.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}
