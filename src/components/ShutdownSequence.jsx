// ShutdownSequence.jsx — Cinematic JARVIS shutdown (3-second choreographed goodbye)
// WHY: Graceful close, not just closing the tab. JARVIS says goodbye.

import { useState, useEffect } from 'react'
import { speakWithFallback } from '../utils/elevenLabsSpeak.js'
import { saveSessionState } from '../utils/sessionContinuity.js'

const BOOT_LINES_REVERSE = [
  'Neural interface',
  'Concept memory',
  'Voice system',
  'Intelligence layer',
  'Event bus',
  'Achievement engine',
  'Sound system',
  'Session timer',
]

export default function ShutdownSequence({ onComplete }) {
  const [phase, setPhase] = useState(0) // 0=dim, 1=text, 2=lines, 3=final, 4=black
  const [lines, setLines] = useState([])
  const [finalText, setFinalText] = useState('')

  useEffect(() => {
    // Save session state for next boot's continuity briefing
    saveSessionState()
    // Signal background to enter shutdown mode
    window.dispatchEvent(new CustomEvent('jarvis-shutdown'))

    // Phase 0: dim (0-500ms)
    setTimeout(() => setPhase(1), 500)

    // Phase 1: JARVIS speaks + "SYSTEMS ENTERING STANDBY" types (500-2000ms)
    setTimeout(() => {
      speakWithFallback('Shutting down, Sir. Rest well. I will be here when you return.')
      let i = 0
      const text = 'SYSTEMS ENTERING STANDBY'
      const interval = setInterval(() => {
        if (i <= text.length) { setFinalText(text.slice(0, i)); i++ }
        else clearInterval(interval)
      }, 40)
    }, 600)

    // Phase 2: reverse boot lines (2000-3500ms)
    setTimeout(() => {
      setPhase(2)
      BOOT_LINES_REVERSE.forEach((line, idx) => {
        setTimeout(() => {
          setLines(prev => [...prev, line])
        }, idx * 150)
      })
    }, 2000)

    // Phase 3: final message (3500-4500ms)
    setTimeout(() => {
      setPhase(3)
      setFinalText('Until tomorrow, Sir.')
    }, 3500)

    // Phase 4: black (4500ms+)
    setTimeout(() => setPhase(4), 4500)

    // Complete (5500ms)
    setTimeout(() => onComplete?.(), 5500)
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center transition-all duration-500"
      style={{ backgroundColor: `rgba(0,0,0,${phase >= 4 ? 1 : phase >= 1 ? 0.85 : 0.6})` }}>

      {phase >= 1 && phase < 4 && (
        <p className="font-mono text-sm tracking-[0.3em] mb-8 transition-opacity duration-500"
          style={{ color: phase >= 3 ? '#d4a853' : '#00b4d8', opacity: phase >= 3 ? 1 : 0.7 }}>
          {finalText}
        </p>
      )}

      {phase === 2 && (
        <div className="space-y-1 mb-8">
          {lines.map((line, i) => (
            <div key={i} className="flex items-center gap-3 boot-line-enter" style={{ animationDelay: `${i * 50}ms` }}>
              <span className="font-mono text-xs" style={{ color: '#5a7a94' }}>▸ {line}</span>
              <span className="font-mono text-[10px] font-bold status-pop" style={{ color: '#eab308' }}>[ STANDBY ]</span>
            </div>
          ))}
        </div>
      )}

      {/* Dim reactor dot */}
      {phase >= 3 && phase < 4 && (
        <div className="w-3 h-3 rounded-full mt-4" style={{ backgroundColor: '#d4a853', boxShadow: '0 0 8px #d4a853', opacity: 0.5 }} />
      )}

      {/* Standby screen */}
      {phase >= 4 && (
        <div className="text-center">
          <p className="font-mono text-xs tracking-[0.4em] mb-6" style={{ color: '#2a4a60' }}>JARVIS OS — STANDBY</p>
          <button onClick={() => window.location.reload()}
            className="font-display text-sm font-bold tracking-wider px-8 py-3 border rounded-lg transition-all hover:bg-cyan/10"
            style={{ color: '#00b4d8', borderColor: '#0d2137' }}>
            WAKE
          </button>
        </div>
      )}
    </div>
  )
}
