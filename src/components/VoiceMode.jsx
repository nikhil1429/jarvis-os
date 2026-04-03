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
import { isEnrolled } from '../utils/voiceFingerprint.js'
import VoiceEnrollment from './VoiceEnrollment.jsx'
import useVoiceVerification from '../hooks/useVoiceVerification.js'
import MODES from '../data/modes.js'

const TAU = Math.PI * 2
const MODE_PILLS = ['chat', 'quiz', 'presser', 'teach', 'battle']

function renderMd(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, l, code) =>
      `<pre style="background:rgba(0,180,216,0.08);padding:8px;border-radius:4px;overflow-x:auto;margin:4px 0;border:1px solid rgba(0,180,216,0.12)"><code style="font-family:Share Tech Mono,monospace;font-size:0.8em;color:#48cae4">${code.trim()}</code></pre>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(0,180,216,0.1);padding:1px 4px;border-radius:3px;font-family:Share Tech Mono,monospace;font-size:0.85em">$1</code>')
    .replace(/\n/g, '<br/>')
}

function TranscriptMessage({ msg }) {
  const [expanded, setExpanded] = useState(false)
  const isUser = msg.role === 'user', isOpus = msg.tier >= 2
  const isLong = (msg.content?.length || 0) > 200
  const display = isLong && !expanded ? msg.content.substring(0, 200) : msg.content
  return (
    <div style={{ textAlign: isUser ? 'right' : 'left' }}>
      <span onClick={() => isLong && setExpanded(!expanded)} style={{
        display: 'inline-block', maxWidth: '90%', padding: '8px 12px', borderRadius: 8, fontSize: 12,
        fontFamily: 'Exo 2', lineHeight: 1.5, cursor: isLong ? 'pointer' : 'default',
        ...(isUser ? { background: 'rgba(0,180,216,0.1)', color: 'rgba(0,180,216,0.85)', borderLeft: '2px solid rgba(0,180,216,0.3)' }
          : isOpus ? { background: 'rgba(212,168,83,0.08)', color: 'rgba(212,168,83,0.85)', borderLeft: '2px solid rgba(212,168,83,0.3)' }
          : { background: 'rgba(6,20,34,0.8)', color: '#d0e8f8', borderLeft: '2px solid rgba(0,180,216,0.15)' }),
      }}>
        {isOpus && !isUser && <span style={{ fontSize: 9, color: '#d4a853', marginRight: 4 }}>&#9889;</span>}
        <span dangerouslySetInnerHTML={{ __html: renderMd(display) }} />
        {isLong && <span style={{ display: 'block', fontSize: 9, color: '#5a7a94', marginTop: 4, fontFamily: 'Share Tech Mono', letterSpacing: '0.1em' }}>
          {expanded ? '\u25B4 COLLAPSE' : 'TAP TO EXPAND \u25BE'}
        </span>}
      </span>
    </div>
  )
}

export default function VoiceMode({ onClose, initialMode = 'chat', weekNumber }) {
  const { sendMessage } = useAI()
  const { get } = useStorage()
  const { play } = useSound()
  const checkIn = useVoiceCheckIn()
  const voice = useJarvisVoice()

  const [currentModeId, setCurrentModeId] = useState(initialMode)
  const [showEnrollment, setShowEnrollment] = useState(!isEnrolled())
  const verification = useVoiceVerification()
  const [messages, setMessages] = useState([])
  const messagesLenRef = useRef(0)
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const analyserRef = useRef(null)
  const audioStreamRef = useRef(null)
  const voiceLevelRef = useRef(0)
  const mouseRef = useRef({ x: 250, y: 250 })
  const transcriptEndRef = useRef(null)
  // Enhancement refs
  const wordBurstRef = useRef([]) // E3: word-burst particles
  const silenceFramesRef = useRef(0) // E5: contemplation tracker
  const contemplatingRef = useRef(false)
  const energyArcRef = useRef([]) // E6: conversation energy
  const lightTracesRef = useRef([]) // E7: message light traces
  const tierFlashRef = useRef(0) // E8: tier escalation frames
  const fragmentsRef = useRef(null) // E9: thinking fragments
  const voiceEchoRef = useRef(null) // E10: ghost echo
  const voiceSamplesRef = useRef([]) // E10: collect samples for echo
  const voiceStateStrRef = useRef('IDLE') // sync ref for canvas loop (avoids stale closure)

  const currentMode = MODES.find(m => m.id === currentModeId) || MODES[0]
  const vs = voice.voiceState
  voiceStateStrRef.current = vs // keep ref in sync for canvas loop

  useEffect(() => { setMessages((get(`msgs-${currentModeId}`) || []).slice(-10)) }, [currentModeId, get])
  useEffect(() => { messagesLenRef.current = messages.length }, [messages])
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
        // E3: trigger word-burst particles
        const words = clean.split(/\s+/)
        const special = ['sir','recruit','operative','commander','architect','opus','excellent','data','evidence','warrior']
        words.forEach((w, wi) => {
          setTimeout(() => {
            const isSpecial = special.includes(w.toLowerCase().replace(/[.,!?]/g, ''))
            const count = isSpecial ? 8 : 3
            for (let p = 0; p < count; p++) {
              const angle = Math.random() * TAU
              wordBurstRef.current.push({ x: 0, y: 0, vx: Math.cos(angle) * (2 + Math.random() * 2), vy: Math.sin(angle) * (2 + Math.random() * 2), life: 30 + Math.random() * 20, maxLife: 50, gold: isSpecial, size: 1 + Math.random() })
            }
            if (isSpecial) tierFlashRef.current = Math.max(tierFlashRef.current, 10) // brief reactor flash
          }, wi * 40)
        })
        // E6: energy arc data point
        energyArcRef.current.push({ energy: 0.5 + (result.tier || 1) * 0.15, role: 'assistant' })
        if (energyArcRef.current.length > 50) energyArcRef.current.shift()
        // E7: light trace
        lightTracesRef.current.push({ progress: 0, color: result.tier >= 2 ? '#d4a853' : '#00b4d8', role: 'assistant' })
        // E8: tier escalation
        if (result.tier >= 2) tierFlashRef.current = 30
      }
    } catch (err) {
      console.error('[VoiceMode]', err)
      // Reset voice state on API error — prevent stuck PROCESSING
      setMessages(prev => [...prev, { role: 'assistant', content: `I encountered an error, Sir. ${err.message || 'Please try again.'}`, timestamp: new Date().toISOString() }])
      voice.speak('I encountered an error, Sir. Please try again.', { isVoiceCommand: true })
    }
  }, [sendMessage, currentModeId, weekNumber, play, voice, checkIn, onClose])

  useEffect(() => {
    const onSend = (e) => handleSend(e.detail.text)
    // V3 fix: interrupt just updates transcript, silence timer in useJarvisVoice handles sending
    const onInterrupt = (e) => {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'user') {
          return [...prev.slice(0, -1), { ...last, content: e.detail.text }]
        }
        return [...prev, { role: 'user', content: e.detail.text, timestamp: new Date().toISOString() }]
      })
    }
    window.addEventListener('jarvis-voice-send', onSend)
    window.addEventListener('jarvis-voice-interrupt', onInterrupt)
    return () => { window.removeEventListener('jarvis-voice-send', onSend); window.removeEventListener('jarvis-voice-interrupt', onInterrupt) }
  }, [handleSend])

  // Canvas animation + audio analyser
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || showEnrollment) return
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

    // E10: load ghost echo
    try {
      const echo = JSON.parse(localStorage.getItem('jos-voice-echo') || 'null')
      if (echo && Date.now() - new Date(echo.timestamp).getTime() < 7 * 24 * 3600000) voiceEchoRef.current = echo
    } catch { /* ok */ }

    // E9: fragment state
    fragmentsRef.current = { active: false, frags: Array.from({length:5}, (_,i) => ({angle: i/5*TAU, rOff: 0, speed: 2})), startTime: 0 }

    let t = 0, echoFade = voiceEchoRef.current ? 1 : 0

    let frameCount = 0
    const draw = () => {
      t += 0.016; frameCount++; ctx.clearRect(0, 0, S, S)
      const vs = voiceStateStrRef.current // read from REF, not stale closure

      // Analyser — read EVERY frame regardless of state (for smooth transitions)
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray)
        const rawLevel = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255
        if (frameCount % 60 === 0 && rawLevel > 0) console.log('VOICE LEVEL:', rawLevel.toFixed(3), 'state:', vs)
      }
      if (analyserRef.current && vs === 'LISTENING') {
        analyserRef.current.getByteFrequencyData(dataArray)
        voiceLevelRef.current = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255
        voiceSamplesRef.current.push(voiceLevelRef.current)
        if (voiceSamplesRef.current.length > 64) voiceSamplesRef.current.shift()
      } else if (vs === 'SPEAKING') {
        voiceLevelRef.current = 0.3 + Math.sin(t * 8) * 0.2 + Math.random() * 0.1
      } else { voiceLevelRef.current *= 0.92 }

      const active = vs !== 'IDLE'
      const gold = vs === 'SPEAKING' || vs === 'PROCESSING'
      const dim = active ? 1 : 0.5
      const spd = vs === 'PROCESSING' ? 1.5 : active ? 1 : 0.5
      const flashMult = tierFlashRef.current > 0 ? 1.5 : 1

      // E5: contemplation tracking
      if (vs === 'LISTENING' && voiceLevelRef.current < 0.05) {
        silenceFramesRef.current++
        if (silenceFramesRef.current > 120) contemplatingRef.current = true // ~2s
      } else { silenceFramesRef.current = 0; contemplatingRef.current = false }
      const contemplate = contemplatingRef.current

      // E8: tier flash decay
      if (tierFlashRef.current > 0) tierFlashRef.current--

      // 1. Guide rings
      const ringDim = contemplate ? 0.4 : dim
      ;[90, 70, 50].forEach(r => { ctx.beginPath(); ctx.arc(C, C, r, 0, TAU); ctx.strokeStyle = `rgba(0,180,216,${0.06 * ringDim * flashMult})`; ctx.lineWidth = 0.5; ctx.stroke() })

      // E10: Ghost echo ring
      if (voiceEchoRef.current && echoFade > 0) {
        const levels = voiceEchoRef.current.levels || []
        if (levels.length > 0) {
          ctx.beginPath()
          for (let i = 0; i < 64; i++) {
            const angle = (i / 64) * TAU
            const r = 45 + (levels[i % levels.length] || 0) * 10
            const x = C + Math.cos(angle) * r, y = C + Math.sin(angle) * r
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
          }
          ctx.closePath(); ctx.strokeStyle = `rgba(26,58,77,${0.06 * echoFade})`; ctx.lineWidth = 1; ctx.stroke()
        }
        if (voiceLevelRef.current > 0.1) echoFade = Math.max(0, echoFade - 0.016)
      }

      // 2. Dashed rings
      const rSpd = contemplate ? spd * 0.2 : spd
      ctx.save(); ctx.translate(C, C)
      ;[{ r: 88, s: t * 0.52 * rSpd, c: '#00b4d8', d: [8, 12], w: 1.2 },
        { r: 72, s: -t * 0.78 * rSpd, c: '#d4a853', d: [5, 10], w: 0.8 },
        { r: 55, s: t * 0.31 * rSpd, c: '#00b4d8', d: [3, 8], w: 0.6 }
      ].forEach(ring => { ctx.beginPath(); ctx.setLineDash(ring.d); ctx.arc(0, 0, ring.r, ring.s, ring.s + TAU * 0.85); ctx.strokeStyle = ring.c + (active ? (tierFlashRef.current > 0 ? '90' : '60') : '30'); ctx.lineWidth = ring.w; ctx.stroke() })
      ctx.setLineDash([]); ctx.restore()

      // 3. Orbiting particles
      const pSpd = contemplate ? 0.2 : 1
      ;[{ r: 80, s: t * 1.1 * pSpd, sz: 2, g: false }, { r: 65, s: -t * 0.7 * pSpd, sz: 1.5, g: true }, { r: 52, s: t * 1.5 * pSpd, sz: 2.5, g: false }].forEach(p => {
        ctx.beginPath(); ctx.arc(C + Math.cos(p.s) * p.r, C + Math.sin(p.s) * p.r, p.sz, 0, TAU)
        ctx.fillStyle = p.g ? `rgba(212,168,83,${0.6 * dim})` : `rgba(0,180,216,${0.5 * dim})`; ctx.shadowBlur = 4; ctx.shadowColor = p.g ? '#d4a853' : '#00b4d8'; ctx.fill(); ctx.shadowBlur = 0
      })

      // E3: Word-burst particles
      wordBurstRef.current = wordBurstRef.current.filter(p => {
        p.x += p.vx; p.y += p.vy; p.life--
        if (p.life <= 0) return false
        const alpha = p.life / p.maxLife
        ctx.beginPath(); ctx.arc(C + p.x, C + p.y, p.size, 0, TAU)
        ctx.fillStyle = p.gold ? `rgba(212,168,83,${alpha * 0.7})` : `rgba(0,240,255,${alpha * 0.5})`
        ctx.fill(); return true
      })

      // 4. Core (or E9 fragments if PROCESSING)
      const pulse = contemplate ? 1 + Math.sin(t * 4.2) * 0.05 : 1 + Math.sin(t * 2.1) * 0.08
      if (vs === 'PROCESSING' && fragmentsRef.current) {
        // E9: Thinking fragments
        fragmentsRef.current.active = true
        fragmentsRef.current.frags.forEach((f, i) => {
          f.angle += f.speed * 0.02; f.rOff = Math.min(8, f.rOff + 0.02); f.speed = Math.min(8, f.speed + 0.01)
          const startA = f.angle, endA = f.angle + TAU / 5 * 0.8
          ctx.beginPath(); ctx.arc(C, C, 22 + f.rOff, startA, endA)
          ctx.strokeStyle = `rgba(212,168,83,${0.5 + f.rOff / 16})`; ctx.lineWidth = 2
          ctx.shadowBlur = 4 + f.rOff; ctx.shadowColor = '#d4a853'; ctx.stroke(); ctx.shadowBlur = 0
        })
        ctx.beginPath(); ctx.arc(C, C, 3, 0, TAU)
        ctx.fillStyle = `rgba(255,255,255,${0.6 + Math.sin(t * 12.6) * 0.4})`; ctx.fill()
      } else {
        // Reset fragments
        if (fragmentsRef.current?.active) {
          fragmentsRef.current.active = false
          fragmentsRef.current.frags.forEach(f => { f.rOff = 0; f.speed = 2 })
        }
        // Normal core
        const og = ctx.createRadialGradient(C, C, 0, C, C, 24 * pulse)
        og.addColorStop(0, gold ? `rgba(212,168,83,${0.3 * flashMult})` : `rgba(0,180,216,${0.3 * flashMult})`); og.addColorStop(1, 'transparent')
        ctx.fillStyle = og; ctx.beginPath(); ctx.arc(C, C, 24 * pulse, 0, TAU); ctx.fill()
        const ig = ctx.createRadialGradient(C, C, 0, C, C, 10 * pulse)
        ig.addColorStop(0, 'rgba(212,168,83,0.8)'); ig.addColorStop(1, 'transparent')
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(C, C, 10 * pulse, 0, TAU); ctx.fill()
        ctx.beginPath(); ctx.arc(C, C, 3, 0, TAU)
        ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(t * 4.2) * 0.3})`; ctx.shadowBlur = 8; ctx.shadowColor = '#ffd080'; ctx.fill(); ctx.shadowBlur = 0
      }

      // E1: Circular orbital waveform — amplitude driven by voice
      const vl = voiceLevelRef.current
      const waveR = 35
      const waveAmp = vs === 'LISTENING' ? vl * 25 : vs === 'SPEAKING' ? vl * 15 : 2
      ctx.beginPath()
      for (let i = 0; i < 64; i++) {
        const angle = (i / 64) * TAU
        const baseAmp = vs === 'PROCESSING' ? 0.5 + Math.random() * 1 : 2 + Math.sin(t * 2 + i * 0.3) * 1.5
        const amp = baseAmp + waveAmp
        const r = waveR + Math.sin(angle * 4 + t * 3) * amp
        const x = C + Math.cos(angle) * r, y = C + Math.sin(angle) * r
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = gold ? 'rgba(212,168,83,0.5)' : 'rgba(0,240,255,0.4)'
      ctx.lineWidth = 1.5; ctx.shadowBlur = 6; ctx.shadowColor = gold ? '#d4a853' : '#00f0ff'; ctx.stroke(); ctx.shadowBlur = 0

      // E7: Light traces
      lightTracesRef.current = lightTracesRef.current.filter(tr => {
        tr.progress += 0.025
        if (tr.progress >= 1 && !tr.persistent) { tr.persistent = true; return true }
        if (tr.persistent) {
          // Faint persistent line from core downward
          ctx.beginPath(); ctx.moveTo(C, C); ctx.lineTo(tr.role === 'user' ? S - 40 : 40, S - 30)
          ctx.strokeStyle = `rgba(0,180,216,0.03)`; ctx.lineWidth = 0.5; ctx.stroke()
          return lightTracesRef.current.filter(x => x.persistent).length <= 10
        }
        const p = tr.progress
        const endX = tr.role === 'user' ? S - 40 : 40, endY = S - 30
        const cx = C + (endX - C) * p, cy = C + (endY - C) * p
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU)
        ctx.fillStyle = tr.color; ctx.shadowBlur = 6; ctx.shadowColor = tr.color; ctx.fill(); ctx.shadowBlur = 0
        return true
      })

      // E6: Energy arc
      if (energyArcRef.current.length > 1) {
        ctx.beginPath()
        energyArcRef.current.forEach((pt, i) => {
          const x = 20 + (i / Math.max(1, energyArcRef.current.length - 1)) * (S - 40)
          const y = S - 15 - pt.energy * 25
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        })
        ctx.strokeStyle = 'rgba(0,180,216,0.3)'; ctx.lineWidth = 1; ctx.stroke()
        ctx.font = '8px "Share Tech Mono"'; ctx.fillStyle = '#2a4a60'; ctx.fillText('ENERGY', 5, S - 5)
      }

      // Mouse glow
      const mx = mouseRef.current.x, my = mouseRef.current.y
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 40)
      mg.addColorStop(0, 'rgba(0,240,255,0.04)'); mg.addColorStop(1, 'transparent')
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 40, 0, TAU); ctx.fill()

      // E5: Contemplation ghost text
      if (contemplate && silenceFramesRef.current > 180) {
        const textAlpha = Math.min(0.4, (silenceFramesRef.current - 180) / 60 * 0.4)
        ctx.font = '11px "Share Tech Mono"'; ctx.fillStyle = `rgba(42,74,96,${textAlpha})`
        ctx.textAlign = 'center'; ctx.fillText('Take your time, Sir.', C, C + 50); ctx.textAlign = 'start'
      }

      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    setTimeout(() => {
      voice.startListening()
      // Start voice verification if enrolled
      if (isEnrolled() && analyserRef.current) {
        verification.startVerification(analyserRef.current)
        verification.startContinuousVerification(analyserRef.current) // E5: 30s re-checks
      }
    }, 200)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      canvas.removeEventListener('pointermove', handleMouse)
      if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop())
      voice.stopListening(); voice.stopSpeaking()
      // E10: save voice echo for next session
      if (voiceSamplesRef.current.length > 0) {
        try {
          localStorage.setItem('jos-voice-echo', JSON.stringify({
            levels: voiceSamplesRef.current.slice(-64),
            timestamp: new Date().toISOString(),
            messageCount: messagesLenRef.current,
          }))
        } catch { /* ok */ }
      }
    }
  }, [showEnrollment])

  // Enrollment screen
  if (showEnrollment) {
    return <VoiceEnrollment onComplete={() => setShowEnrollment(false)} onSkip={() => setShowEnrollment(false)} />
  }

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

        {/* Voice biometrics status */}
        <div style={{ textAlign: 'center', marginTop: 4, minHeight: 30 }}>
          {verification.status === 'verified' && (
            <p style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: '#10b981', letterSpacing: '0.12em' }}>
              IDENTITY VERIFIED {verification.confidence}% | LEVEL {verification.authLevel.level}
            </p>
          )}
          {verification.status === 'mismatch' && (
            <p className="animate-pulse" style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: '#ef4444', letterSpacing: '0.12em' }}>
              {verification.speaker?.name !== 'unknown' ? `SPEAKER: ${verification.speaker.name.toUpperCase()} — SHOW MODE` : 'UNRECOGNIZED SPEAKER'}
            </p>
          )}
          {verification.status === 'drift' && (
            <p className="animate-pulse" style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: '#ef4444', letterSpacing: '0.12em' }}>VOICE DRIFT — SECURE MODE</p>
          )}
          {verification.status === 'checking' && (
            <p style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: '#d4a853', letterSpacing: '0.12em' }}>VERIFYING...</p>
          )}
          {verification.detectedMood.mood !== 'neutral' && verification.detectedMood.confidence > 45 && (
            <p style={{ fontFamily: 'Share Tech Mono', fontSize: 7, letterSpacing: '0.1em', marginTop: 2, opacity: 0.6,
              color: { stressed: '#ef4444', excited: '#d4a853', tired: '#5a7a94', focused: '#10b981' }[verification.detectedMood.mood] || '#5a7a94' }}>
              MOOD: {verification.detectedMood.mood.toUpperCase()} | VITALS: {verification.voiceVitals.status === 'normal' ? 'NOMINAL' : verification.voiceVitals.status.toUpperCase()}
            </p>
          )}
        </div>
      </div>

      {/* Transcript — expandable messages with markdown */}
      <div className="px-5 pb-5 overflow-y-auto" style={{ maxHeight: '40vh', flexShrink: 0 }}>
        {messages.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {messages.slice(-10).map((msg, i) => <TranscriptMessage key={i} msg={msg} />)}
          <div ref={transcriptEndRef} />
        </div>}
      </div>
    </div>
  )
}
