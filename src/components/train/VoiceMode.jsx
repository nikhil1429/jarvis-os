// VoiceMode.jsx — Full-screen voice conversation overlay with waveform
// WHY: Voice Mode creates an immersive, distraction-free voice conversation.
// Large center circle with waveform visualization reacting to voice input,
// scrollable transcript below, mode selector pills at top.
// Triggered by long-pressing the mic button in ChatView.

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Mic } from 'lucide-react'
import useAI from '../../hooks/useAI.js'
import useSound from '../../hooks/useSound.js'
import useVoice, { VOICE_STATES } from '../../hooks/useVoice.js'
import useTTS from '../../hooks/useTTS.js'

// Modes available in voice mode (most common conversation modes)
const VOICE_MODES = [
  { id: 'chat', label: 'Chat', emoji: '💬' },
  { id: 'quiz', label: 'Quiz', emoji: '🧠' },
  { id: 'presser', label: 'Presser', emoji: '🎤' },
  { id: 'teach', label: 'Teach', emoji: '📖' },
  { id: 'battle', label: 'Battle', emoji: '⚔️' },
]

export default function VoiceMode({ mode, weekNumber, messages, setMessages, onClose }) {
  const { sendMessage, isStreaming } = useAI()
  const { play } = useSound()
  const voice = useVoice()
  const tts = useTTS()

  const [currentMode, setCurrentMode] = useState(mode)
  const [voiceLevel, setVoiceLevel] = useState(0)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const streamRef = useRef(null)

  const vs = voice.voiceState

  // WHY: Web Audio API analyser for waveform visualization.
  // Connects to microphone stream and reads frequency data to drive the circle animation.
  const startAnalyser = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const update = () => {
        if (!analyserRef.current) return
        analyser.getByteFrequencyData(dataArray)
        // Average the first 10 bins for voice-relevant frequencies
        const avg = dataArray.slice(0, 10).reduce((s, v) => s + v, 0) / 10
        setVoiceLevel(avg / 255)
        animFrameRef.current = requestAnimationFrame(update)
      }
      update()
    } catch {
      // Mic not available — use default animation
    }
  }, [])

  const stopAnalyser = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    analyserRef.current = null
    setVoiceLevel(0)
  }, [])

  // Send handler for voice mode
  const handleVoiceSend = useCallback(async (text) => {
    if (!text?.trim() || isStreaming) return

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    play('send')

    try {
      const result = await sendMessage(text, currentMode.id, { weekNumber })
      if (result) {
        const assistantMsg = {
          role: 'assistant',
          content: result.text,
          timestamp: new Date().toISOString(),
          model: result.model,
          tier: result.tier,
        }
        setMessages(prev => [...prev, assistantMsg])
        play('receive')

        if (tts.isVoiceEnabled()) {
          voice.setSpeaking()
          await tts.speak(result.text, {
            onEnd: () => {
              play('ready')
              voice.setReady(handleVoiceSend)
            },
          })
        }
      }
    } catch (err) {
      console.error('[VoiceMode] Send failed:', err)
    }
  }, [isStreaming, sendMessage, currentMode.id, weekNumber, setMessages, play, tts, voice])

  // Start voice on mount
  useEffect(() => {
    startAnalyser()
    voice.startListening(handleVoiceSend)
    return () => {
      stopAnalyser()
      voice.stopListening()
      tts.stop()
    }
  }, []) // Intentionally empty — run once on mount

  // Check for "stop" keyword in transcript
  useEffect(() => {
    const t = (voice.transcript || '').toLowerCase()
    if (t.includes('jarvis stop') || t.includes('jarvis, stop')) {
      voice.stopListening()
      tts.stop()
      onClose()
    }
  }, [voice.transcript])

  // Circle scale driven by voice level
  const circleScale = 1 + voiceLevel * 0.15

  // State text
  const stateText = {
    [VOICE_STATES.IDLE]: 'Tap to start',
    [VOICE_STATES.LISTENING]: 'Listening...',
    [VOICE_STATES.PROCESSING]: 'Thinking...',
    [VOICE_STATES.SPEAKING]: 'Speaking...',
    [VOICE_STATES.READY]: 'Ready',
  }[vs] || ''

  // Circle border color
  const circleBorder = (vs === VOICE_STATES.SPEAKING || vs === VOICE_STATES.PROCESSING)
    ? '#d4a853' : '#00b4d8'

  const circleGlow = (vs === VOICE_STATES.SPEAKING || vs === VOICE_STATES.PROCESSING)
    ? 'rgba(212, 168, 83, 0.3)' : 'rgba(0, 180, 216, 0.3)'

  // Last 10 messages for transcript display
  const recentMessages = messages.slice(-10)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: 'rgba(2, 10, 19, 0.98)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        {/* Mode selector pills */}
        <div className="flex gap-1.5 overflow-x-auto">
          {VOICE_MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setCurrentMode(m)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px]
                tracking-wider transition-all duration-200 flex-shrink-0 ${
                currentMode.id === m.id
                  ? 'bg-cyan/15 border border-cyan/40 text-cyan'
                  : 'border border-border text-text-dim hover:text-text'
              }`}
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="text-text-muted hover:text-cyan transition-colors ml-3"
        >
          <X size={22} />
        </button>
      </div>

      {/* Center: Waveform circle */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <button
          onClick={() => {
            if (vs === VOICE_STATES.IDLE || vs === VOICE_STATES.READY) {
              voice.startListening(handleVoiceSend)
            } else if (vs === VOICE_STATES.LISTENING) {
              const t = voice.transcript?.trim()
              if (t) handleVoiceSend(t)
              else voice.stopListening()
            } else if (vs === VOICE_STATES.SPEAKING) {
              tts.stop()
              voice.handleInterruption(handleVoiceSend)
              voice.startListening(handleVoiceSend)
            }
          }}
          className="relative flex items-center justify-center transition-transform duration-100"
          style={{
            width: '200px',
            height: '200px',
            transform: `scale(${circleScale})`,
          }}
        >
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full transition-all duration-300"
            style={{
              border: `3px solid ${circleBorder}`,
              boxShadow: `0 0 30px ${circleGlow}, inset 0 0 30px ${circleGlow}`,
              opacity: vs === VOICE_STATES.IDLE ? 0.4 : 0.9,
            }}
          />

          {/* Inner glow */}
          <div
            className="absolute rounded-full transition-all duration-500"
            style={{
              width: '60%',
              height: '60%',
              background: `radial-gradient(circle, ${circleGlow} 0%, transparent 70%)`,
              opacity: vs === VOICE_STATES.LISTENING ? 0.8 + voiceLevel * 0.2 : 0.3,
            }}
          />

          {/* Center icon */}
          <Mic
            size={40}
            className="relative z-10 transition-colors duration-300"
            style={{ color: circleBorder }}
          />

          {/* Processing orbiting dots */}
          {vs === VOICE_STATES.PROCESSING && (
            <>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-gold rounded-full"
                  style={{
                    animation: `voice-orbit 1.5s linear infinite`,
                    animationDelay: `${i * 0.5}s`,
                  }}
                />
              ))}
            </>
          )}
        </button>

        {/* State text */}
        <p
          className="font-mono text-sm tracking-widest mt-6 transition-colors duration-300"
          style={{
            color: (vs === VOICE_STATES.SPEAKING || vs === VOICE_STATES.PROCESSING) ? '#d4a853' : '#00b4d8',
          }}
        >
          {stateText}
        </p>

        {/* Live transcript preview */}
        {vs === VOICE_STATES.LISTENING && (voice.transcript || voice.interimTranscript) && (
          <p className="font-body text-sm text-text/70 mt-3 max-w-xs text-center italic">
            "{voice.transcript || voice.interimTranscript}"
          </p>
        )}
      </div>

      {/* Scrollable transcript */}
      <div className="flex-shrink-0 max-h-[30vh] overflow-y-auto px-6 pb-6 space-y-2">
        {recentMessages.map((msg, i) => (
          <div
            key={i}
            className={`font-body text-sm px-3 py-2 rounded ${
              msg.role === 'user'
                ? 'text-text/70 bg-cyan/5 ml-8'
                : 'text-text bg-card mr-8 border-l-2 border-l-cyan/30'
            }`}
          >
            {msg.content.length > 150 ? msg.content.slice(0, 150) + '...' : msg.content}
          </div>
        ))}
      </div>
    </div>
  )
}
