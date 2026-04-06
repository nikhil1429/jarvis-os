// VoiceOverlay.jsx — Full-screen Gemini Live voice interface
import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const TAU = Math.PI * 2

function renderMd(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(0,180,216,0.1);padding:1px 4px;border-radius:3px;font-family:Share Tech Mono,monospace;font-size:0.85em">$1</code>')
    .replace(/\n/g, '<br/>')
}

export default function VoiceOverlay({ gemini, onClose }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const analyserRef = useRef(null)
  const micStreamRef = useRef(null)
  const voiceLevelRef = useRef(0)
  const transcriptEndRef = useRef(null)

  const messages = gemini.transcript || []

  // Derive voice state from last transcript entry
  const lastMsg = messages[messages.length - 1]
  const voiceState = !gemini.isConnected ? 'IDLE'
    : lastMsg?.role === 'assistant' && (Date.now() - new Date(lastMsg.timestamp).getTime() < 3000) ? 'SPEAKING'
    : 'LISTENING'

  // Auto-scroll on new messages
  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  // Canvas animation + mic analyser
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio, 2)
    const S = 500
    canvas.width = S * dpr; canvas.height = S * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const C = S / 2

    // Mic stream for analyser (echo-cancelled so it only picks up user voice)
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      .then(stream => {
        micStreamRef.current = stream
        try {
          const actx = new (window.AudioContext || window.webkitAudioContext)()
          const source = actx.createMediaStreamSource(stream)
          const analyser = actx.createAnalyser(); analyser.fftSize = 256
          source.connect(analyser); analyserRef.current = analyser
        } catch { /* ok */ }
      }).catch(() => {})

    const dataArray = new Uint8Array(128)
    let t = 0

    const draw = () => {
      t += 0.016; ctx.clearRect(0, 0, S, S)

      // Read voice level
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray)
        const raw = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255
        voiceLevelRef.current = voiceState === 'LISTENING' ? raw
          : voiceState === 'SPEAKING' ? 0.3 + Math.sin(t * 8) * 0.2 + Math.random() * 0.1
          : voiceLevelRef.current * 0.92
      }

      const vl = voiceLevelRef.current
      const active = voiceState !== 'IDLE'
      const gold = voiceState === 'SPEAKING'
      const dim = active ? 1 : 0.5
      const spd = active ? 1 : 0.5

      // 1. Guide rings
      ;[90, 70, 50].forEach(r => {
        ctx.beginPath(); ctx.arc(C, C, r, 0, TAU)
        ctx.strokeStyle = `rgba(0,180,216,${0.06 * dim})`; ctx.lineWidth = 0.5; ctx.stroke()
      })

      // 2. Dashed rotating rings
      ctx.save(); ctx.translate(C, C)
      ;[{ r: 88, s: t * 0.52 * spd, c: '#00b4d8', d: [8, 12], w: 1.2 },
        { r: 72, s: -t * 0.78 * spd, c: '#d4a853', d: [5, 10], w: 0.8 },
        { r: 55, s: t * 0.31 * spd, c: '#00b4d8', d: [3, 8], w: 0.6 }
      ].forEach(ring => {
        ctx.beginPath(); ctx.setLineDash(ring.d)
        ctx.arc(0, 0, ring.r, ring.s, ring.s + TAU * 0.85)
        ctx.strokeStyle = ring.c + (active ? '60' : '30'); ctx.lineWidth = ring.w; ctx.stroke()
      })
      ctx.setLineDash([]); ctx.restore()

      // 3. Orbiting particles
      ;[{ r: 80, s: t * 1.1, sz: 2, g: false },
        { r: 65, s: -t * 0.7, sz: 1.5, g: true },
        { r: 52, s: t * 1.5, sz: 2.5, g: false }
      ].forEach(p => {
        ctx.beginPath(); ctx.arc(C + Math.cos(p.s) * p.r, C + Math.sin(p.s) * p.r, p.sz, 0, TAU)
        ctx.fillStyle = p.g ? `rgba(212,168,83,${0.6 * dim})` : `rgba(0,180,216,${0.5 * dim})`
        ctx.shadowBlur = 4; ctx.shadowColor = p.g ? '#d4a853' : '#00b4d8'; ctx.fill(); ctx.shadowBlur = 0
      })

      // 4. Core glow
      const pulse = 1 + Math.sin(t * 2.1) * 0.08
      const og = ctx.createRadialGradient(C, C, 0, C, C, 24 * pulse)
      og.addColorStop(0, gold ? 'rgba(212,168,83,0.3)' : 'rgba(0,180,216,0.3)'); og.addColorStop(1, 'transparent')
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(C, C, 24 * pulse, 0, TAU); ctx.fill()
      const ig = ctx.createRadialGradient(C, C, 0, C, C, 10 * pulse)
      ig.addColorStop(0, 'rgba(212,168,83,0.8)'); ig.addColorStop(1, 'transparent')
      ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(C, C, 10 * pulse, 0, TAU); ctx.fill()
      ctx.beginPath(); ctx.arc(C, C, 3, 0, TAU)
      ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(t * 4.2) * 0.3})`
      ctx.shadowBlur = 8; ctx.shadowColor = '#ffd080'; ctx.fill(); ctx.shadowBlur = 0

      // 5. Circular waveform driven by voice level
      const waveR = 35
      const waveAmp = voiceState === 'LISTENING' ? vl * 25 : voiceState === 'SPEAKING' ? vl * 15 : 2
      ctx.beginPath()
      for (let i = 0; i < 64; i++) {
        const angle = (i / 64) * TAU
        const baseAmp = 2 + Math.sin(t * 2 + i * 0.3) * 1.5
        const r = waveR + Math.sin(angle * 4 + t * 3) * (baseAmp + waveAmp)
        const x = C + Math.cos(angle) * r, y = C + Math.sin(angle) * r
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = gold ? 'rgba(212,168,83,0.5)' : 'rgba(0,240,255,0.4)'
      ctx.lineWidth = 1.5; ctx.shadowBlur = 6; ctx.shadowColor = gold ? '#d4a853' : '#00f0ff'
      ctx.stroke(); ctx.shadowBlur = 0

      animRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null }
    }
  }, [voiceState])

  const stateLabel = { IDLE: 'CONNECTING...', LISTENING: 'LISTENING...', SPEAKING: 'SPEAKING...' }[voiceState] || 'IDLE'
  const stateColor = voiceState === 'SPEAKING' ? '#d4a853' : voiceState === 'LISTENING' ? '#00b4d8' : '#5a7a94'

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col" style={{ backgroundColor: 'rgba(2,10,19,0.98)' }}>
      {/* Corner brackets */}
      {[['left','top'],['right','top'],['left','bottom'],['right','bottom']].map(([h,v], i) => (
        <div key={i} style={{ position: 'absolute', [v]: 8, [h]: 8, width: 20, height: 20,
          [`border${h.charAt(0).toUpperCase()+h.slice(1)}`]: '2px solid rgba(0,240,255,0.15)',
          [`border${v.charAt(0).toUpperCase()+v.slice(1)}`]: '2px solid rgba(0,240,255,0.15)' }} />
      ))}

      {/* Close button */}
      <div className="flex justify-end px-5 pt-5" style={{ flexShrink: 0 }}>
        <button onClick={onClose} style={{ color: '#5a7a94', padding: 8 }}><X size={22} /></button>
      </div>

      {/* Reactor */}
      <div className="flex-1 flex flex-col items-center justify-center" style={{ minHeight: 0 }}>
        <canvas ref={canvasRef} style={{ width: 'min(80vw, 350px)', height: 'min(80vw, 350px)' }} />
        <p className={voiceState !== 'IDLE' ? 'animate-pulse' : ''} style={{
          fontFamily: 'Share Tech Mono', fontSize: 13, letterSpacing: '0.15em', color: stateColor, marginTop: 16
        }}>{stateLabel}</p>
      </div>

      {/* Transcript */}
      <div className="px-5 pb-5 overflow-y-auto" style={{ maxHeight: '40vh', flexShrink: 0 }}>
        {messages.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {messages.slice(-10).map((msg, i) => {
              const isUser = msg.role === 'user'
              const content = msg.content || msg.text || ''
              return (
                <div key={i} style={{ textAlign: isUser ? 'right' : 'left' }}>
                  <span style={{
                    display: 'inline-block', maxWidth: '90%', padding: '8px 12px', borderRadius: 8,
                    fontSize: 12, fontFamily: 'Exo 2', lineHeight: 1.5,
                    ...(isUser
                      ? { background: 'rgba(0,180,216,0.1)', color: 'rgba(0,180,216,0.85)', borderLeft: '2px solid rgba(0,180,216,0.3)' }
                      : { background: 'rgba(6,20,34,0.8)', color: '#d0e8f8', borderLeft: '2px solid rgba(0,180,216,0.15)' })
                  }}>
                    <span dangerouslySetInnerHTML={{ __html: renderMd(content) }} />
                  </span>
                </div>
              )
            })}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}
