// VoiceOverlay.jsx — Full-screen voice interaction overlay
// WHY: Immersive voice UI with circular waveform visualization. Shows state
// (LISTENING/SPEAKING/PROCESSING), last transcript, and close button.
// Canvas 2D waveform reacts to audio state. Escape closes without disconnecting.

import { useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'

export default function VoiceOverlay({ gemini, onClose }) {
  const { state, transcript, disconnect } = gemini
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const angleRef = useRef(0)

  // ── State label ────────────────────────────────────────────────────────
  const stateLabel = (() => {
    switch (state) {
      case 'LISTENING': return 'LISTENING'
      case 'SPEAKING': return 'SPEAKING'
      case 'PROCESSING': return 'PROCESSING'
      case 'CONNECTING': return 'CONNECTING...'
      default: return state
    }
  })()

  const stateColor = state === 'SPEAKING' ? '#00f0ff' : state === 'PROCESSING' ? '#d4a853' : '#00b4d8'

  // ── Canvas Waveform ────────────────────────────────────────────────────
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const cx = W / 2
    const cy = H / 2
    const baseRadius = Math.min(W, H) * 0.3

    ctx.clearRect(0, 0, W, H)

    const now = Date.now() / 1000
    angleRef.current += 0.01

    if (state === 'SPEAKING') {
      // Active waveform — frequency bars in circular arrangement
      const bars = 64
      for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2
        const amplitude = (Math.sin(now * 4 + i * 0.5) * 0.5 + 0.5) * 30 +
                          (Math.sin(now * 7 + i * 0.3) * 0.3 + 0.3) * 20
        const r1 = baseRadius - 5
        const r2 = baseRadius + amplitude

        const x1 = cx + Math.cos(angle) * r1
        const y1 = cy + Math.sin(angle) * r1
        const x2 = cx + Math.cos(angle) * r2
        const y2 = cy + Math.sin(angle) * r2

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.4 + amplitude / 80})`
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Inner glow circle
      ctx.beginPath()
      ctx.arc(cx, cy, baseRadius - 8, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)'
      ctx.lineWidth = 1
      ctx.stroke()
    } else if (state === 'PROCESSING') {
      // Rotating gold dots
      const dots = 12
      for (let i = 0; i < dots; i++) {
        const angle = (i / dots) * Math.PI * 2 + angleRef.current * 3
        const x = cx + Math.cos(angle) * baseRadius
        const y = cy + Math.sin(angle) * baseRadius
        const alpha = 0.3 + Math.sin(now * 3 + i) * 0.3 + 0.3

        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(212, 168, 83, ${alpha})`
        ctx.fill()
      }
    } else {
      // LISTENING / default — gentle breathing circle
      const breathe = Math.sin(now * 1.2) * 8
      const r = baseRadius + breathe

      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(0, 180, 216, 0.3)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Inner ring
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(0, 180, 216, 0.25)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Subtle pulse dot at center
      const dotAlpha = 0.5 + Math.sin(now * 2) * 0.3
      ctx.beginPath()
      ctx.arc(cx, cy, 4, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(0, 180, 216, ${dotAlpha})`
      ctx.fill()
    }

    animFrameRef.current = requestAnimationFrame(drawFrame)
  }, [state])

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(drawFrame)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [drawFrame])

  // ── Resize canvas ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const size = Math.min(window.innerWidth * 0.8, 300)
      canvas.width = size * dpr
      canvas.height = size * dpr
      canvas.style.width = size + 'px'
      canvas.style.height = size + 'px'
      canvas.getContext('2d').scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // ── Escape to close ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
      style={{ background: 'rgba(2, 10, 19, 0.95)' }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full transition-colors"
        style={{ color: '#5a7a94', background: 'rgba(13, 33, 55, 0.5)' }}
      >
        <X size={20} />
      </button>

      {/* Waveform canvas */}
      <canvas ref={canvasRef} className="mb-8" />

      {/* State indicator */}
      <p
        className="font-mono text-xs tracking-[0.3em] mb-6"
        style={{ color: stateColor }}
      >
        {stateLabel}
      </p>

      {/* Output transcript or state feedback */}
      {transcript.output ? (
        <p
          className="font-mono text-sm text-center max-w-md px-6 leading-relaxed mb-4"
          style={{
            color: '#d0e8f8',
            fontFamily: "'Share Tech Mono', monospace",
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            animation: 'fade-in 0.3s ease-out',
          }}
        >
          {transcript.output}
        </p>
      ) : (
        <p
          className="font-mono text-xs text-center max-w-sm px-6"
          style={{ color: stateColor, opacity: 0.6 }}
        >
          {state === 'SPEAKING' ? 'JARVIS is speaking...' :
           state === 'PROCESSING' ? 'Thinking...' :
           state === 'LISTENING' ? 'Listening — speak to JARVIS' :
           state === 'CONNECTING' ? 'Establishing connection...' :
           'Voice active'}
        </p>
      )}

      {/* Input transcript */}
      {transcript.input && (
        <p
          className="font-mono text-xs text-center max-w-sm px-6"
          style={{ color: '#5a7a94' }}
        >
          You said: {transcript.input}
        </p>
      )}

      {/* Disconnect button at bottom */}
      <button
        onClick={() => { disconnect(); onClose() }}
        className="absolute bottom-8 font-mono text-xs tracking-wider px-4 py-2 rounded border transition-colors"
        style={{ color: '#5a7a94', borderColor: '#0d2137', background: 'rgba(6, 20, 34, 0.8)' }}
      >
        DISCONNECT
      </button>
    </div>
  )
}
