// VoiceMode.jsx — Full-screen exocortex voice interface with Canvas 2D reactor
// WHY: THE voice interface. Canvas reactor with waveform driven by Web Audio analyser.

import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import useAI from '../hooks/useAI.js'
import useStorage from '../hooks/useStorage.js'
import useSound from '../hooks/useSound.js'
import useVoiceCheckIn from '../hooks/useVoiceCheckIn.js'
import useJarvisVoice from '../hooks/useJarvisVoice.js'
import { processVoiceCommand } from '../utils/voiceCommands.js'
import { stripQuizTags } from '../utils/quizScoring.js'
import MODES from '../data/modes.js'

const TAU = Math.PI * 2
const MODE_PILLS = ['chat', 'quiz', 'presser', 'teach', 'battle']

export default function VoiceMode({ onClose, initialMode = 'chat', weekNumber }) {
  const { sendMessage } = useAI()
  const { get } = useStorage()
  const { play } = useSound()
  const checkIn = useVoiceCheckIn()
  const voice = useJarvisVoice()

  const [currentModeId, setCurrentModeId] = useState(initialMode)
  const [messages, setMessages] = useState([])
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const analyserRef = useRef(null)
  const audioStreamRef = useRef(null)
  const voiceLevelRef = useRef(0)
  const mouseRef = useRef({ x: 250, y: 250 })
  const transcriptEndRef = useRef(null)

  const currentMode = MODES.find(m => m.id === currentModeId) || MODES[0]
  const vs = voice.voiceState

  useEffect(() => { setMessages((get(`msgs-${currentModeId}`) || []).slice(-10)) }, [currentModeId, get])
  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = useCallback(async (text) => {
    const trimmed = text?.trim()
    if (!trimmed) return
    if (checkIn.active) {
      const r = checkIn.processAnswer(trimmed)
      if (r) { setMessages(prev => [...prev, { role: 'assistant', content: r.nextPrompt, timestamp: new Date().toISOString() }]); voice.speak(r.nextPrompt, { isVoiceCommand: true }) }
      return
    }
    const cmd = processVoiceCommand(trimmed)
    if (cmd) {
      setMessages(prev => [...prev, { role: 'user', content: trimmed, timestamp: new Date().toISOString() }])
      if (cmd.type === 'stop') { voice.stopSpeaking(); setTimeout(() => onClose(), 1500); return }
      if (cmd.type === 'shutdown') { window.dispatchEvent(new CustomEvent('jarvis-request-shutdown')); onClose(); return }
      if (cmd.type === 'checkin') checkIn.start()
      if (cmd.type === 'mode') setCurrentModeId(cmd.mode)
      setMessages(prev => [...prev, { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }])
      voice.speak(cmd.response, { isVoiceCommand: true }); return
    }
    setMessages(prev => [...prev, { role: 'user', content: trimmed, timestamp: new Date().toISOString() }])
    play('send')
    try {
      const result = await sendMessage(trimmed, currentModeId, { weekNumber })
      if (result) {
        const clean = stripQuizTags(result.text)
        setMessages(prev => [...prev, { role: 'assistant', content: clean, timestamp: new Date().toISOString(), tier: result.tier }])
        play('receive'); voice.speak(clean)
      }
    } catch (err) { console.error('[VoiceMode]', err) }
  }, [sendMessage, currentModeId, weekNumber, play, voice, checkIn, onClose])

  useEffect(() => {
    const onSend = (e) => handleSend(e.detail.text)
    window.addEventListener('jarvis-voice-send', onSend)
    window.addEventListener('jarvis-voice-interrupt', onSend)
    return () => { window.removeEventListener('jarvis-voice-send', onSend); window.removeEventListener('jarvis-voice-interrupt', onSend) }
  }, [handleSend])

  // Canvas animation + audio analyser
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio, 2)
    const S = 500
    canvas.width = S * dpr; canvas.height = S * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const C = S / 2

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      audioStreamRef.current = stream
      try {
        const actx = new (window.AudioContext || window.webkitAudioContext)()
        const source = actx.createMediaStreamSource(stream)
        const analyser = actx.createAnalyser(); analyser.fftSize = 256
        source.connect(analyser); analyserRef.current = analyser
      } catch { /* ok */ }
    }).catch(() => {})

    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: ((e.clientX - rect.left) / rect.width) * S, y: ((e.clientY - rect.top) / rect.height) * S }
    }
    canvas.addEventListener('pointermove', handleMouse)
    const dataArray = new Uint8Array(128)

    let t = 0
    const draw = () => {
      t += 0.016; ctx.clearRect(0, 0, S, S)
      if (analyserRef.current && voice.voiceState === 'LISTENING') {
        analyserRef.current.getByteFrequencyData(dataArray)
        voiceLevelRef.current = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255
      } else if (voice.voiceState === 'SPEAKING') {
        voiceLevelRef.current = 0.3 + Math.sin(t * 8) * 0.2 + Math.random() * 0.1
      } else { voiceLevelRef.current *= 0.92 }

      const active = voice.voiceState !== 'IDLE'
      const gold = voice.voiceState === 'SPEAKING' || voice.voiceState === 'PROCESSING'
      const dim = active ? 1 : 0.5
      const spd = voice.voiceState === 'PROCESSING' ? 1.5 : active ? 1 : 0.5

      // Guide rings
      ;[90, 70, 50].forEach(r => { ctx.beginPath(); ctx.arc(C, C, r, 0, TAU); ctx.strokeStyle = `rgba(0,180,216,${0.06 * dim})`; ctx.lineWidth = 0.5; ctx.stroke() })

      // Dashed rings
      ctx.save(); ctx.translate(C, C)
      ;[{ r: 88, s: t * 0.52 * spd, c: '#00b4d8', d: [8, 12], w: 1.2 },
        { r: 72, s: -t * 0.78 * spd, c: '#d4a853', d: [5, 10], w: 0.8 },
        { r: 55, s: t * 0.31 * spd, c: '#00b4d8', d: [3, 8], w: 0.6 }
      ].forEach(ring => { ctx.beginPath(); ctx.setLineDash(ring.d); ctx.arc(0, 0, ring.r, ring.s, ring.s + TAU * 0.85); ctx.strokeStyle = ring.c + (active ? '60' : '30'); ctx.lineWidth = ring.w; ctx.stroke() })
      ctx.setLineDash([]); ctx.restore()

      // Particles
      ;[{ r: 80, s: t * 1.1, sz: 2, g: false }, { r: 65, s: -t * 0.7, sz: 1.5, g: true }, { r: 52, s: t * 1.5, sz: 2.5, g: false }].forEach(p => {
        ctx.beginPath(); ctx.arc(C + Math.cos(p.s) * p.r, C + Math.sin(p.s) * p.r, p.sz, 0, TAU)
        ctx.fillStyle = p.g ? `rgba(212,168,83,${0.6 * dim})` : `rgba(0,180,216,${0.5 * dim})`; ctx.shadowBlur = 4; ctx.shadowColor = p.g ? '#d4a853' : '#00b4d8'; ctx.fill(); ctx.shadowBlur = 0
      })

      // Core
      const pulse = 1 + Math.sin(t * 2.1) * 0.08
      const og = ctx.createRadialGradient(C, C, 0, C, C, 24 * pulse)
      og.addColorStop(0, gold ? 'rgba(212,168,83,0.3)' : 'rgba(0,180,216,0.3)'); og.addColorStop(1, 'transparent')
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(C, C, 24 * pulse, 0, TAU); ctx.fill()
      const ig = ctx.createRadialGradient(C, C, 0, C, C, 10 * pulse)
      ig.addColorStop(0, 'rgba(212,168,83,0.8)'); ig.addColorStop(1, 'transparent')
      ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(C, C, 10 * pulse, 0, TAU); ctx.fill()
      ctx.beginPath(); ctx.arc(C, C, 3, 0, TAU)
      ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(t * 4.2) * 0.3})`; ctx.shadowBlur = 8; ctx.shadowColor = '#ffd080'; ctx.fill(); ctx.shadowBlur = 0

      // Waveform
      const vl = voiceLevelRef.current
      ctx.beginPath()
      for (let i = 0; i <= 10; i++) {
        const x = C - 60 + i * 12
        const baseAmp = voice.voiceState === 'PROCESSING' ? 1 + Math.random() * 2 : 3 + Math.sin(t * 2 + i * 0.8) * 2
        const y = C + Math.sin(t * 3 + i * 0.9) * (baseAmp + vl * 25)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = gold ? 'rgba(212,168,83,0.6)' : 'rgba(0,240,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke()

      // Mouse glow
      const mx = mouseRef.current.x, my = mouseRef.current.y
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 40)
      mg.addColorStop(0, 'rgba(0,240,255,0.04)'); mg.addColorStop(1, 'transparent')
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 40, 0, TAU); ctx.fill()

      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    setTimeout(() => voice.startListening(), 200)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      canvas.removeEventListener('pointermove', handleMouse)
      if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop())
      voice.stopListening(); voice.stopSpeaking()
    }
  }, [])

  const stateLabel = { IDLE: 'TAP TO SPEAK', LISTENING: 'LISTENING...', PROCESSING: 'PROCESSING...', SPEAKING: 'SPEAKING...' }[vs]
  const stateColor = vs === 'SPEAKING' || vs === 'PROCESSING' ? '#d4a853' : vs === 'LISTENING' ? '#00b4d8' : '#5a7a94'

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col" style={{ backgroundColor: 'rgba(2,10,19,0.98)' }}>
      {/* Corner brackets */}
      {[[8,8,'Left','Top'],[8,8,'Right','Top'],[8,8,'Left','Bottom'],[8,8,'Right','Bottom']].map(([,,h,v], i) => (
        <div key={i} style={{ position:'absolute', [v.toLowerCase()]:8, [h.toLowerCase()]:8, width:20, height:20, [`border${h}`]:'2px solid rgba(0,240,255,0.15)', [`border${v}`]:'2px solid rgba(0,240,255,0.15)' }} />
      ))}

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2" style={{ flexShrink: 0 }}>
        <div className="flex gap-1.5">
          {MODE_PILLS.map(id => {
            const m = MODES.find(x => x.id === id)
            return m ? <button key={id} onClick={() => setCurrentModeId(id)} style={{
              fontFamily: 'Share Tech Mono', fontSize: 10, letterSpacing: '0.08em', padding: '4px 10px', borderRadius: 50,
              border: `1px solid ${currentModeId === id ? '#00b4d860' : '#0d2137'}`,
              background: currentModeId === id ? 'rgba(0,180,216,0.12)' : 'transparent',
              color: currentModeId === id ? '#00b4d8' : '#2a4a60',
            }}>{m.name}</button> : null
          })}
        </div>
        <button onClick={() => { voice.stopSpeaking(); voice.stopListening(); onClose() }} style={{ color: '#5a7a94', padding: 8 }}><X size={22} /></button>
      </div>

      {/* Reactor */}
      <div className="flex-1 flex flex-col items-center justify-center" style={{ minHeight: 0 }}>
        <canvas ref={canvasRef} onClick={() => { if (vs === 'SPEAKING') voice.stopSpeaking(); else if (vs === 'LISTENING') voice.stopListening(); else voice.startListening() }}
          style={{ width: 'min(80vw, 350px)', height: 'min(80vw, 350px)', cursor: 'pointer' }} />
        <p className={vs !== 'IDLE' ? 'animate-pulse' : ''} style={{ fontFamily: 'Share Tech Mono', fontSize: 13, letterSpacing: '0.15em', color: stateColor, marginTop: 16 }}>
          {stateLabel}{voice.silenceCountdown && <span style={{ marginLeft: 8, color: '#5a7a94', fontSize: 10 }}>{voice.silenceCountdown}</span>}
        </p>
        <p style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#2a4a60', marginTop: 8, letterSpacing: '0.2em' }}>{currentMode.emoji} {currentMode.name.toUpperCase()} · EXOCORTEX</p>
      </div>

      {/* Transcript */}
      <div className="px-5 pb-5 overflow-y-auto" style={{ maxHeight: '35vh', flexShrink: 0 }}>
        {messages.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {messages.slice(-10).map((msg, i) => (
            <div key={i} style={{ textAlign: msg.role === 'user' ? 'right' : 'left' }}>
              <span style={{ display: 'inline-block', maxWidth: '85%', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'Exo 2', lineHeight: 1.4,
                ...(msg.role === 'user' ? { background: 'rgba(0,180,216,0.1)', color: 'rgba(0,180,216,0.8)' }
                  : msg.tier >= 2 ? { background: 'rgba(212,168,83,0.08)', color: 'rgba(212,168,83,0.8)' }
                  : { background: 'rgba(6,20,34,0.8)', color: '#d0e8f8' }),
              }}>{msg.tier >= 2 && msg.role === 'assistant' && <span style={{ fontSize: 9, color: '#d4a853', marginRight: 4 }}>⚡</span>}
                {msg.content?.length > 180 ? msg.content.substring(0, 180) + '...' : msg.content}</span>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>}
      </div>
    </div>
  )
}
