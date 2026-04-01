// VoiceMode.jsx — Full-screen immersive voice interface
// Uses useJarvisVoice hook for all voice logic. This file is just UI.

import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import useAI from '../hooks/useAI.js'
import useStorage from '../hooks/useStorage.js'
import useSound from '../hooks/useSound.js'
import useVoiceCheckIn from '../hooks/useVoiceCheckIn.js'
import useJarvisVoice from '../hooks/useJarvisVoice.js'
import { processVoiceCommand } from '../utils/voiceCommands.js'
import MODES from '../data/modes.js'

export default function VoiceMode({ onClose, initialMode = 'chat', weekNumber }) {
  const { sendMessage } = useAI()
  const { get } = useStorage()
  const { play } = useSound()
  const checkIn = useVoiceCheckIn()
  const voice = useJarvisVoice()

  const [currentModeId, setCurrentModeId] = useState(initialMode)
  const [messages, setMessages] = useState([])
  const [voiceLevel, setVoiceLevel] = useState(0)

  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const audioStreamRef = useRef(null)
  const transcriptEndRef = useRef(null)

  const currentMode = MODES.find(m => m.id === currentModeId) || MODES[0]

  // Load history

  // Auto-scroll
  // Cleanup
  // Auto-start listening + setup analyser
  // Listen for voice events

  const handleSend = useCallback(async (text) => {
    const trimmed = text?.trim()
    if (!trimmed) return

    if (checkIn.active) {
      const r = checkIn.processAnswer(trimmed)
      if (r) {
        setMessages(prev => [...prev, { role: 'assistant', content: r.nextPrompt, timestamp: new Date().toISOString() }])
        voice.speak(r.nextPrompt, { isVoiceCommand: true })
      }
      return
    }

    const cmd = processVoiceCommand(trimmed)
    if (cmd) {
      setMessages(prev => [...prev, { role: 'user', content: trimmed, timestamp: new Date().toISOString() }])
      if (cmd.type === 'stop') { voice.stopSpeaking(); setTimeout(() => onClose(), 1500); return }
      if (cmd.type === 'checkin') { checkIn.start() }
      if (cmd.type === 'mode') setCurrentModeId(cmd.mode)
      setMessages(prev => [...prev, { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }])
      voice.speak(cmd.response, { isVoiceCommand: true })
      return
    }

    setMessages(prev => [...prev, { role: 'user', content: trimmed, timestamp: new Date().toISOString() }])
    play('send')
    try {
      const result = await sendMessage(trimmed, currentModeId, { weekNumber })
      if (result) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.text, timestamp: new Date().toISOString(), tier: result.tier }])
        play('receive')
        voice.speak(result.text)
      }
    } catch (err) { console.error('[VoiceMode] Send failed:', err) }
  }, [sendMessage, currentModeId, weekNumber, play, voice, checkIn, onClose])

  useEffect(() => {
    setMessages((get(`msgs-${currentModeId}`) || []).slice(-10))
  }, [currentModeId, get])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => {
      voice.stopListening()
      voice.stopSpeaking()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        audioStreamRef.current = stream
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)()
          const source = ctx.createMediaStreamSource(stream)
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 256
          source.connect(analyser)
          analyserRef.current = analyser
          const dataArray = new Uint8Array(analyser.frequencyBinCount)
          const tick = () => {
            analyser.getByteFrequencyData(dataArray)
            setVoiceLevel(dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255)
            animFrameRef.current = requestAnimationFrame(tick)
          }
          tick()
        } catch { /* ok */ }
      }).catch(() => {})
      voice.startListening()
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const onSend = (e) => handleSend(e.detail.text)
    const onInterrupt = (e) => handleSend(e.detail.text) // interrupted speech → treat as new input
    window.addEventListener('jarvis-voice-send', onSend)
    window.addEventListener('jarvis-voice-interrupt', onInterrupt)
    return () => {
      window.removeEventListener('jarvis-voice-send', onSend)
      window.removeEventListener('jarvis-voice-interrupt', onInterrupt)
    }
  }, [])


  const handleCircleTap = () => {
    if (voice.voiceState === 'SPEAKING') voice.stopSpeaking()
    else if (voice.voiceState === 'LISTENING') voice.stopListening()
    else voice.startListening()
  }

  const vs = voice.voiceState
  const circleScale = vs === 'LISTENING' ? 1 + voiceLevel * 0.15 : 1
  const circleBorder = vs === 'SPEAKING' || vs === 'PROCESSING' ? '#d4a853' : '#00b4d8'
  const circleGlow = vs === 'SPEAKING' || vs === 'PROCESSING' ? 'rgba(212,168,83,0.3)' : 'rgba(0,180,216,0.3)'

  const stateText = {
    IDLE: { text: 'Tap to speak', color: '#5a7a94' },
    LISTENING: { text: 'Listening...', color: '#00b4d8' },
    PROCESSING: { text: 'Thinking...', color: '#d4a853' },
    SPEAKING: { text: 'Speaking...', color: '#d4a853' },
  }[vs]

  const modePills = ['chat', 'quiz', 'presser', 'teach', 'battle']

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col" style={{ backgroundColor: 'rgba(2, 10, 19, 0.98)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2" style={{ flexShrink: 0 }}>
        <div className="flex gap-1.5">
          {modePills.map(id => {
            const m = MODES.find(mode => mode.id === id)
            if (!m) return null
            return (
              <button key={id} onClick={() => setCurrentModeId(id)}
                className={`font-mono text-[10px] tracking-wider px-2.5 py-1 rounded-full border transition-all ${
                  currentModeId === id ? 'border-cyan/60 bg-cyan/15 text-cyan' : 'border-border text-text-muted hover:border-cyan/30'
                }`}>{m.name}</button>
            )
          })}
        </div>
        <button onClick={() => { voice.stopSpeaking(); voice.stopListening(); onClose() }}
          className="p-2 text-text-muted hover:text-text transition-colors"><X size={24} /></button>
      </div>

      {/* Center circle */}
      <div className="flex-1 flex flex-col items-center justify-center" style={{ minHeight: 0 }}>
        <button onClick={handleCircleTap} className="relative flex items-center justify-center transition-transform duration-100"
          style={{
            width: 180, height: 180, borderRadius: '50%', border: `3px solid ${circleBorder}`,
            background: `radial-gradient(circle, ${circleGlow} 0%, transparent 70%)`,
            boxShadow: `0 0 30px ${circleGlow}`, transform: `scale(${circleScale})`,
          }}>
          {vs === 'PROCESSING' && (
            <div className="flex gap-2">
              <span className="w-2.5 h-2.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2.5 h-2.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2.5 h-2.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
          {vs === 'SPEAKING' && <div className="absolute inset-0 rounded-full animate-pulse" style={{ border: `2px solid ${circleBorder}`, opacity: 0.4 }} />}
        </button>
        <p className="font-mono text-sm tracking-wider mt-6" style={{ color: stateText.color }}>{stateText.text}</p>
        {checkIn.active && <p className="font-mono text-[10px] text-gold/60 tracking-wider mt-2">CHECK-IN: {checkIn.fieldIndex + 1}/{checkIn.totalFields}</p>}
        <p className="font-mono text-[10px] text-text-muted tracking-widest mt-2">{currentMode.emoji} {currentMode.name.toUpperCase()}</p>
      </div>

      {/* Transcript */}
      <div className="px-5 pb-5 overflow-y-auto" style={{ maxHeight: '35vh', flexShrink: 0 }}>
        {messages.length > 0 && (
          <div className="space-y-2">
            {messages.slice(-10).map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`font-body text-xs max-w-[85%] px-3 py-1.5 rounded-lg ${
                  msg.role === 'user' ? 'bg-cyan/10 text-cyan/80'
                  : msg.tier >= 2 ? 'bg-gold/10 text-gold/80' : 'bg-card text-text-dim'
                }`}>{msg.content?.length > 150 ? msg.content.substring(0, 150) + '...' : msg.content}</p>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}
