// JarvisVoiceButton.jsx — Floating voice button for Gemini Live
import { useState, useEffect } from 'react'
import { Mic } from 'lucide-react'

export default function JarvisVoiceButton({ gemini }) {
  const { isConnected, error, startTime } = gemini
  const [elapsed, setElapsed] = useState(0)
  const [showError, setShowError] = useState(false)

  const enabled = (() => { try { return JSON.parse(localStorage.getItem('jos-settings') || '{}').geminiVoice !== false } catch { return true } })()

  // Elapsed timer
  useEffect(() => {
    if (!isConnected) { setElapsed(0); return }
    const i = setInterval(() => setElapsed(Math.round((Date.now() - (startTime || Date.now())) / 1000)), 1000)
    return () => clearInterval(i)
  }, [isConnected, startTime])

  // Error tooltip (4s)
  useEffect(() => { if (error) { setShowError(true); setTimeout(() => setShowError(false), 4000) } }, [error])

  if (!enabled) return null

  const handleClick = () => {
    if (isConnected) {
      gemini.disconnect()
    } else {
      gemini.connect()
      window.dispatchEvent(new CustomEvent('jarvis-open-voice'))
    }
  }

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <>
      {showError && error && (
        <div className="fixed bottom-24 right-4 z-50 max-w-xs">
          <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-3 py-2">
            <p className="font-mono text-[10px] text-red-400">{error}</p>
          </div>
        </div>
      )}

      <button onClick={handleClick}
        className={`fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
          isConnected
            ? 'bg-gold/20 border-2 border-gold shadow-[0_0_20px_rgba(212,168,83,0.3)]'
            : 'bg-cyan/10 border border-cyan/30 hover:bg-cyan/20 animate-pulse'
        }`} style={{ backdropFilter: 'blur(8px)' }}>
        <Mic size={20} className={isConnected ? 'text-gold animate-pulse' : 'text-cyan'} />
        {isConnected && (
          <span className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-gold/90 text-void font-mono text-[7px] font-bold tracking-wider px-1.5 py-0.5 rounded-full">
            <span className="w-1 h-1 bg-void rounded-full animate-pulse" />LIVE
          </span>
        )}
      </button>

      {isConnected && (
        <div className="fixed bottom-[4.2rem] right-4 z-50 text-center" style={{ width: 48 }}>
          <span className="font-mono text-[9px] text-gold/70 tracking-wider">{fmt(elapsed)}</span>
        </div>
      )}
    </>
  )
}
