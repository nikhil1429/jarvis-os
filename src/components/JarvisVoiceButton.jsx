// JarvisVoiceButton.jsx — Floating mic button for Gemini Live voice
// WHY: Always-visible entry point for voice. Bottom-right, above BottomNav.
// Shows connection state via border color/glow and LIVE badge.

import { Mic } from 'lucide-react'

export default function JarvisVoiceButton({ gemini }) {
  const { state, connect, disconnect, isConnected, elapsed, error } = gemini

  const isError = state === 'ERROR'

  const handleClick = () => {
    if (isConnected) {
      // Open voice overlay
      window.dispatchEvent(new CustomEvent('jarvis-open-voice'))
    } else if (state === 'CONNECTING') {
      // Do nothing while connecting
    } else {
      connect()
    }
  }

  const handleLongPress = () => {
    if (isConnected) disconnect()
  }

  // Format elapsed time as mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <button
      onClick={handleClick}
      onContextMenu={(e) => { e.preventDefault(); handleLongPress() }}
      title={error || (isConnected ? `Connected ${formatTime(elapsed)} — click to open, right-click to disconnect` : 'Click to connect voice')}
      className="fixed z-50 flex items-center justify-center rounded-full transition-all duration-300"
      style={{
        bottom: 80,
        right: 16,
        width: 48,
        height: 48,
        background: '#061422',
        border: `1px solid ${isError ? '#ff4444' : isConnected ? '#00b4d8' : '#0d2137'}`,
        boxShadow: isError
          ? '0 0 12px rgba(255,68,68,0.4)'
          : isConnected
            ? '0 0 12px rgba(0,180,216,0.3), 0 0 24px rgba(0,180,216,0.1)'
            : 'none',
        animation: isError ? 'pulse 1.5s ease-in-out infinite' : undefined,
      }}
    >
      <Mic size={20} color={isConnected ? '#00f0ff' : isError ? '#ff4444' : '#5a7a94'} />

      {/* LIVE badge */}
      {isConnected && (
        <span
          className="absolute font-mono tracking-wider"
          style={{
            top: -6,
            right: -4,
            fontSize: 8,
            color: '#020a13',
            background: '#00b4d8',
            padding: '1px 4px',
            borderRadius: 3,
            fontWeight: 700,
          }}
        >
          LIVE
        </span>
      )}

      {/* Elapsed time below button */}
      {isConnected && (
        <span
          className="absolute font-mono"
          style={{
            bottom: -16,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 9,
            color: '#5a7a94',
            whiteSpace: 'nowrap',
          }}
        >
          {formatTime(elapsed)}
        </span>
      )}
    </button>
  )
}
