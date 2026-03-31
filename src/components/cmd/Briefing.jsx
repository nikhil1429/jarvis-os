// Briefing.jsx — Displays the morning briefing persistently on CMD tab
// WHY: Boot briefing disappears after entering the app. This card shows it
// on the CMD tab so Nikhil can re-read or replay it anytime.

import { Mic, Volume2 } from 'lucide-react'
import useStorage from '../../hooks/useStorage.js'
import { speakElevenLabs } from '../../utils/elevenLabsSpeak.js'

export default function Briefing() {
  const { get } = useStorage()
  const weekly = get('weekly') || {}
  const today = new Date().toISOString().split('T')[0]

  // Look for today's briefing in weekly data
  const briefing = weekly.briefing || weekly.lastBriefing

  const handleReplay = async () => {
    if (briefing?.text) {
      const settings = JSON.parse(localStorage.getItem('jos-settings') || '{}')
      if (settings.voice !== false) {
        await speakElevenLabs(briefing.text)
      }
    }
  }

  const handleMic = () => {
    window.dispatchEvent(new CustomEvent('jarvis-activate-mic'))
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
          <button onClick={handleMic}
            className="p-2 rounded-lg border border-border text-text-muted hover:border-cyan/40 hover:text-cyan transition-all">
            <Mic size={16} />
          </button>
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
            <button onClick={handleMic}
              className="p-1.5 rounded border border-border text-text-muted hover:border-cyan/40 hover:text-cyan transition-all"
              title="Talk to JARVIS">
              <Mic size={14} />
            </button>
          </div>
        </div>
        <p className="font-body text-xs text-text leading-relaxed">{briefing.text}</p>
        {briefing.generatedAt && (
          <p className="font-mono text-[8px] text-text-muted mt-1.5">
            {new Date(briefing.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}
