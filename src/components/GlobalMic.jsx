// GlobalMic.jsx — Floating mic button visible on all tabs
// WHY: Voice-first JARVIS means you should be able to speak from ANY screen.
// Tap → opens Chat mode with mic active. Long-press (500ms) → full-screen VoiceMode.
// Positioned above BottomNav, left of QuickCapture lightbulb.

import { useState, useRef, useCallback } from 'react'
import { Mic } from 'lucide-react'

export default function GlobalMic({ onTap, onLongPress, voiceState }) {
  const [pressing, setPressing] = useState(false)
  const timerRef = useRef(null)
  const didLongPress = useRef(false)

  const handlePointerDown = useCallback(() => {
    didLongPress.current = false
    setPressing(true)
    timerRef.current = setTimeout(() => {
      didLongPress.current = true
      setPressing(false)
      onLongPress?.()
    }, 500)
  }, [onLongPress])

  const handlePointerUp = useCallback(() => {
    setPressing(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!didLongPress.current) {
      onTap?.()
    }
  }, [onTap])

  const handlePointerCancel = useCallback(() => {
    setPressing(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const isListening = voiceState === 'LISTENING'
  const isSpeaking = voiceState === 'SPEAKING'

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={e => e.preventDefault()}
      className={`fixed z-40 flex items-center justify-center
        w-[52px] h-[52px] rounded-full transition-all duration-200
        ${isListening
          ? 'bg-cyan/20 border-2 border-cyan shadow-[0_0_16px_rgba(0,180,216,0.4)] animate-pulse'
          : isSpeaking
            ? 'bg-gold/15 border-2 border-gold/60 shadow-[0_0_12px_rgba(212,168,83,0.3)]'
            : pressing
              ? 'bg-cyan/15 border-2 border-cyan/60 scale-95'
              : 'bg-void/90 border-2 border-border hover:border-cyan/40 backdrop-blur-sm'
        }`}
      style={{ bottom: '5rem', right: '4.5rem' }}
      aria-label="Voice input"
    >
      <Mic
        size={22}
        className={
          isListening ? 'text-cyan' : isSpeaking ? 'text-gold' : 'text-text-dim'
        }
      />
    </button>
  )
}
