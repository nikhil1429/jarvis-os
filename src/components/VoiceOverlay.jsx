// VoiceOverlay.jsx — Full-screen JARVIS voice interface (Exocortex)
// WHY: Immersive voice UI with reactor core visualization, state transitions,
// and visual feedback. Direct Gemini Live voice conversation.

import { useEffect, useRef, useCallback, useState } from 'react'
import { X } from 'lucide-react'

export default function VoiceOverlay({ gemini, onClose }) {
  const { state, transcript, disconnect, elapsed } = gemini
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const angleRef = useRef(0)
  const [showHint, setShowHint] = useState(true)

  // Hide hint after first state change from initial
  useEffect(() => {
    if (state === 'LISTENING' || state === 'SPEAKING') {
      const t = setTimeout(() => setShowHint(false), 3000)
      return () => clearTimeout(t)
    }
  }, [state])

  // State config
  const stateConfig = {
    LISTENING: { label: 'LISTENING', color: '#00b4d8', glow: 'rgba(0,180,216,0.3)', icon: '●' },
    SPEAKING: { label: 'JARVIS SPEAKING', color: '#00f0ff', glow: 'rgba(0,240,255,0.4)', icon: '◉' },
    PROCESSING: { label: 'PROCESSING', color: '#d4a853', glow: 'rgba(212,168,83,0.3)', icon: '◎' },
    CONNECTING: { label: 'CONNECTING', color: '#5a7a94', glow: 'rgba(90,122,148,0.2)', icon: '○' },
    CONNECTED: { label: 'CONNECTED', color: '#00b4d8', glow: 'rgba(0,180,216,0.2)', icon: '●' },
    DISCONNECTED: { label: 'DISCONNECTED', color: '#ef4444', glow: 'rgba(239,68,68,0.2)', icon: '○' },
  }
  const cfg = stateConfig[state] || stateConfig.DISCONNECTED

  // Canvas — multi-ring reactor with waveform
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = canvas.width / (window.devicePixelRatio || 1)
    const cx = size / 2
    const cy = size / 2
    const baseRadius = size * 0.28

    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()

    const now = Date.now() / 1000
    angleRef.current += 0.008

    // Outer ring (slow spin, cyan)
    const outerR = baseRadius * 1.35
    ctx.beginPath()
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
    ctx.strokeStyle = state === 'SPEAKING' ? 'rgba(0,240,255,0.25)' : 'rgba(0,180,216,0.12)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Orbiting dots on outer ring
    const dotCount = 8
    for (let i = 0; i < dotCount; i++) {
      const a = (i / dotCount) * Math.PI * 2 + angleRef.current * 2
      const dx = cx + Math.cos(a) * outerR
      const dy = cy + Math.sin(a) * outerR
      const alpha = state === 'SPEAKING' ? 0.6 : 0.25
      ctx.beginPath()
      ctx.arc(dx, dy, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = state === 'PROCESSING' ? `rgba(212,168,83,${alpha})` : `rgba(0,180,216,${alpha})`
      ctx.fill()
    }

    // Middle ring (medium spin, opposite direction)
    const midR = baseRadius * 1.1
    ctx.beginPath()
    ctx.arc(cx, cy, midR, 0, Math.PI * 2)
    ctx.strokeStyle = state === 'SPEAKING' ? 'rgba(0,240,255,0.18)' : 'rgba(0,180,216,0.08)'
    ctx.lineWidth = 0.8
    ctx.stroke()

    if (state === 'SPEAKING') {
      // Active waveform — frequency bars in circular arrangement
      const bars = 48
      for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2
        const amp = (Math.sin(now * 5 + i * 0.6) * 0.5 + 0.5) * 25 +
                    (Math.sin(now * 8 + i * 0.4) * 0.3 + 0.3) * 18
        const r1 = baseRadius - 3
        const r2 = baseRadius + amp

        const x1 = cx + Math.cos(angle) * r1
        const y1 = cy + Math.sin(angle) * r1
        const x2 = cx + Math.cos(angle) * r2
        const y2 = cy + Math.sin(angle) * r2

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.3 + amp / 60})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    } else if (state === 'PROCESSING') {
      // Rotating gold dots
      const dots = 12
      for (let i = 0; i < dots; i++) {
        const angle = (i / dots) * Math.PI * 2 + angleRef.current * 4
        const x = cx + Math.cos(angle) * baseRadius
        const y = cy + Math.sin(angle) * baseRadius
        const alpha = 0.3 + Math.sin(now * 4 + i) * 0.35

        ctx.beginPath()
        ctx.arc(x, y, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(212, 168, 83, ${alpha})`
        ctx.fill()
      }
    } else if (state === 'LISTENING') {
      // Breathing circle with mic-reactive pulse
      const breathe = Math.sin(now * 1.5) * 10
      const r = baseRadius + breathe

      // Pulse arcs
      for (let i = 0; i < 3; i++) {
        const segStart = (i / 3) * Math.PI * 2 + angleRef.current * 1.5
        const segEnd = segStart + Math.PI * 0.5
        ctx.beginPath()
        ctx.arc(cx, cy, r, segStart, segEnd)
        ctx.strokeStyle = `rgba(0, 180, 216, ${0.2 + Math.sin(now * 2 + i) * 0.1})`
        ctx.lineWidth = 2
        ctx.stroke()
      }
    } else {
      // Idle / connecting — gentle breathing
      const breathe = Math.sin(now * 0.8) * 6
      const r = baseRadius + breathe
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(0,180,216,0.15)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Inner core (always visible)
    const coreAlpha = state === 'SPEAKING' ? 0.5 : state === 'LISTENING' ? 0.35 : 0.2
    const coreColor = state === 'PROCESSING' ? '212,168,83' : '0,180,216'
    const corePulse = Math.sin(now * 2) * 3

    // Core glow
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 0.5 + corePulse)
    gradient.addColorStop(0, `rgba(${coreColor},${coreAlpha * 0.6})`)
    gradient.addColorStop(0.5, `rgba(${coreColor},${coreAlpha * 0.15})`)
    gradient.addColorStop(1, `rgba(${coreColor},0)`)
    ctx.beginPath()
    ctx.arc(cx, cy, baseRadius * 0.5 + corePulse, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    // Center dot
    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${coreColor},${0.5 + Math.sin(now * 3) * 0.3})`
    ctx.fill()

    // Gold inner ring for Opus-tier
    if (state === 'PROCESSING') {
      const goldR = baseRadius * 0.65
      ctx.beginPath()
      ctx.arc(cx, cy, goldR, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(212,168,83,0.2)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    animFrameRef.current = requestAnimationFrame(drawFrame)
  }, [state])

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(drawFrame)
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [drawFrame])

  // Resize canvas for retina
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const size = Math.min(window.innerWidth * 0.75, 320)
      canvas.width = size * dpr
      canvas.height = size * dpr
      canvas.style.width = size + 'px'
      canvas.style.height = size + 'px'
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Escape to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Format elapsed time
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
      style={{ background: 'rgba(2, 10, 19, 0.97)' }}>

      {/* Corner brackets */}
      <div style={{ position: 'absolute', top: 12, left: 12, width: 20, height: 20, borderTop: '1px solid rgba(0,180,216,0.15)', borderLeft: '1px solid rgba(0,180,216,0.15)' }} />
      <div style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderTop: '1px solid rgba(0,180,216,0.15)', borderRight: '1px solid rgba(0,180,216,0.15)' }} />
      <div style={{ position: 'absolute', bottom: 12, left: 12, width: 20, height: 20, borderBottom: '1px solid rgba(0,180,216,0.15)', borderLeft: '1px solid rgba(0,180,216,0.15)' }} />
      <div style={{ position: 'absolute', bottom: 12, right: 12, width: 20, height: 20, borderBottom: '1px solid rgba(0,180,216,0.15)', borderRight: '1px solid rgba(0,180,216,0.15)' }} />

      {/* NEURAL LINK ACTIVE label */}
      <div className="absolute top-5 left-0 right-0 text-center">
        <span className="font-mono text-[9px] tracking-[0.4em]"
          style={{ color: cfg.color, opacity: 0.5 }}>
          NEURAL LINK ACTIVE
        </span>
      </div>

      {/* Close button */}
      <button onClick={onClose}
        className="absolute top-4 right-4 p-2.5 rounded-full transition-all"
        style={{ color: '#5a7a94', background: 'rgba(13,33,55,0.5)', border: '1px solid rgba(13,33,55,0.8)' }}>
        <X size={18} />
      </button>

      {/* Elapsed time */}
      {elapsed > 0 && (
        <p className="absolute top-5 right-16 font-mono text-[10px]"
          style={{ color: '#2a4a60' }}>
          {formatTime(elapsed)}
        </p>
      )}

      {/* Reactor canvas */}
      <canvas ref={canvasRef} style={{ marginBottom: 24 }} />

      {/* State indicator with glow */}
      <div className="flex items-center gap-2 mb-4" style={{ animation: state === 'LISTENING' ? 'pulse 2s ease-in-out infinite' : 'none' }}>
        <span className="font-mono text-xs" style={{ color: cfg.color, textShadow: `0 0 12px ${cfg.glow}` }}>
          {cfg.icon}
        </span>
        <p className="font-mono text-xs tracking-[0.25em]" style={{ color: cfg.color }}>
          {cfg.label}
        </p>
      </div>

      {/* Transcript / state feedback */}
      <div className="text-center max-w-md px-8 mb-6" style={{ minHeight: 48 }}>
        {transcript.output ? (
          <p className="font-body text-sm leading-relaxed" style={{ color: '#d0e8f8' }}>
            {transcript.output}
          </p>
        ) : (
          <p className="font-mono text-xs" style={{ color: cfg.color, opacity: 0.5 }}>
            {state === 'SPEAKING' ? 'JARVIS is speaking — tap to interrupt' :
             state === 'PROCESSING' ? 'Analysing...' :
             state === 'LISTENING' ? 'Speak to JARVIS' :
             state === 'CONNECTING' ? 'Establishing neural link...' :
             state === 'DISCONNECTED' ? 'Connection lost — reconnecting...' :
             'Voice link active'}
          </p>
        )}
        {transcript.input && (
          <p className="font-mono text-[10px] mt-2" style={{ color: '#2a4a60' }}>
            You: {transcript.input}
          </p>
        )}
      </div>

      {/* Hint text (fades out) */}
      {showHint && state === 'LISTENING' && (
        <p className="font-mono text-[10px] mb-4" style={{ color: '#2a4a60', animation: 'fade-in 0.5s ease-out' }}>
          Speak naturally — JARVIS can hear you
        </p>
      )}

      {/* Disconnect button */}
      <button onClick={() => { disconnect(); onClose() }}
        className="absolute bottom-8 font-mono text-[10px] tracking-[0.2em] px-5 py-2.5 rounded transition-all"
        style={{ color: '#5a7a94', border: '1px solid #0d2137', background: 'rgba(6,20,34,0.8)' }}>
        DISCONNECT
      </button>
    </div>
  )
}
