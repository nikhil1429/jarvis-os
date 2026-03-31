// VoiceMode.jsx — Full-screen immersive voice interface
// WHY: Long-press mic opens this cinema-grade voice screen. Large reactive circle
// with Web Audio analyser, scrollable transcript, mode switching — zero touch needed.
// All messages save to jos-msgs-{mode} and go through modelRouter as normal.

import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import useAI from '../hooks/useAI.js'
import useStorage from '../hooks/useStorage.js'
import useSound from '../hooks/useSound.js'
import useVoiceCheckIn from '../hooks/useVoiceCheckIn.js'
import { processVoiceCommand } from '../utils/voiceCommands.js'
import { speakElevenLabs } from '../utils/elevenLabsSpeak.js'
import { shouldUseElevenLabs } from '../utils/smartVoiceRouter.js'
import { shouldJarvisSpeak } from '../utils/speakDecision.js'
import { detectVoiceControl, getSilenceDelay, jarvisStop } from '../utils/voiceControl.js'
import MODES from '../data/modes.js'

const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

const VS = { IDLE: 'IDLE', LISTENING: 'LISTENING', PROCESSING: 'PROCESSING', SPEAKING: 'SPEAKING' }

export default function VoiceMode({ onClose, initialMode = 'chat', weekNumber }) {
  const { sendMessage } = useAI()
  const { get } = useStorage()
  const { play, startThinking, stopThinking } = useSound()
  const checkIn = useVoiceCheckIn()

  const [voiceState, setVoiceState] = useState(VS.IDLE)
  const [currentModeId, setCurrentModeId] = useState(initialMode)
  const [messages, setMessages] = useState([])
  const [voiceLevel, setVoiceLevel] = useState(0)

  const voiceStateRef = useRef(VS.IDLE)
  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const timeoutTimerRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const audioStreamRef = useRef(null)
  const transcriptEndRef = useRef(null)
  const startListeningRef = useRef(null)

  const currentMode = MODES.find(m => m.id === currentModeId) || MODES[0]

  const updateState = useCallback((s) => {
    voiceStateRef.current = s
    setVoiceState(s)
  }, [])

  // Load message history
  useEffect(() => {
    const history = get(`msgs-${currentModeId}`) || []
    setMessages(history.slice(-10))
  }, [currentModeId, get])

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop())
      window.speechSynthesis?.cancel()
    }
  }, [])

  // Auto-reactivation — uses ref to always have latest startListening
  useEffect(() => {
    const handler = () => {
      console.log('AUTO: jarvis-done-speaking received (VoiceMode)')
      const settings = JSON.parse(localStorage.getItem('jos-settings') || '{}')
      if (settings.autoConversation !== false) {
        console.log('AUTO: reactivating mic in 600ms (VoiceMode)')
        setTimeout(() => {
          if (startListeningRef.current) startListeningRef.current()
        }, 600)
      }
    }
    window.addEventListener('jarvis-done-speaking', handler)
    return () => window.removeEventListener('jarvis-done-speaking', handler)
  }, [])

  // ============================================================
  // WEB AUDIO ANALYSER — drives circle scale
  // ============================================================
  const setupAnalyser = useCallback((stream) => {
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
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setVoiceLevel(avg / 255) // 0-1
        animFrameRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch { /* ok — analyser is nice-to-have */ }
  }, [])

  // ============================================================
  // SMART TTS — ElevenLabs + browser fallback with atmosphere sounds
  // ============================================================
  const speakJarvis = useCallback(async (text, context = {}) => {
    const settings = JSON.parse(localStorage.getItem('jos-settings') || '{}')
    if (settings.voice === false) {
      updateState(VS.IDLE)
      window.dispatchEvent(new CustomEvent('jarvis-done-speaking'))
      return
    }

    updateState(VS.SPEAKING)
    play('commOpen')
    await new Promise(r => setTimeout(r, 80))

    const useEL = shouldUseElevenLabs(text, context)
    let success = false

    if (useEL) {
      success = await speakElevenLabs(text)
    }

    if (!success) {
      const synth = window.speechSynthesis
      if (synth) {
        const cleanText = text.replace(/[*_~`#]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/\n{2,}/g, '. ').replace(/\n/g, ', ').replace(/[-]{3,}/g, '').trim()

        if (cleanText) {
          synth.cancel()
          await new Promise(r => setTimeout(r, 100))

          const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText]
          let voice = window._jarvisVoice
          if (!voice) {
            const voices = synth.getVoices()
            voice = voices.find(v => v.name.includes('Google UK English Male'))
              || voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes('male'))
              || voices.find(v => v.lang === 'en-GB')
              || voices.find(v => v.lang.startsWith('en'))
              || voices[0]
            window._jarvisVoice = voice
          }

          await new Promise((resolve) => {
            sentences.forEach((sentence, i) => {
              const utterance = new SpeechSynthesisUtterance(sentence.trim())
              utterance.voice = voice
              utterance.rate = settings.voiceSpeed || 1.0
              utterance.pitch = 0.95
              if (i === sentences.length - 1) {
                utterance.onend = resolve
                utterance.onerror = resolve
              }
              synth.speak(utterance)
            })
          })
        }
      }
    }

    play('commClose')
    updateState(VS.IDLE)
    window.dispatchEvent(new CustomEvent('jarvis-done-speaking'))
  }, [updateState, play])

  // ============================================================
  // SEND — process commands, check-in, or API with atmosphere sounds
  // ============================================================
  const handleSend = useCallback(async (text) => {
    const trimmed = text?.trim()
    if (!trimmed) return

    // Voice check-in active? Route answer to check-in state machine
    if (checkIn.active) {
      const result = checkIn.processAnswer(trimmed)
      if (result) {
        const jarvisMsg = { role: 'assistant', content: result.nextPrompt, timestamp: new Date().toISOString() }
        setMessages(prev => [...prev, jarvisMsg])
        speakJarvis(result.nextPrompt, { isVoiceCommand: true })
      }
      return
    }

    // Check voice commands
    const cmd = processVoiceCommand(trimmed)
    if (cmd) {
      const userMsg = { role: 'user', content: trimmed, timestamp: new Date().toISOString() }
      setMessages(prev => [...prev, userMsg])

      if (cmd.type === 'stop') {
        speakJarvis(cmd.response, { isVoiceCommand: true })
        setTimeout(() => onClose(), 2000)
        return
      }
      if (cmd.type === 'checkin') {
        checkIn.start()
        const jarvisMsg = { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }
        setMessages(prev => [...prev, jarvisMsg])
        speakJarvis(cmd.response, { isVoiceCommand: true })
        return
      }
      if (cmd.type === 'mode') {
        setCurrentModeId(cmd.mode)
        const jarvisMsg = { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }
        setMessages(prev => [...prev, jarvisMsg])
        speakJarvis(cmd.response, { isVoiceCommand: true })
        return
      }
      const jarvisMsg = { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }
      setMessages(prev => [...prev, jarvisMsg])
      speakJarvis(cmd.response, { isVoiceCommand: true })
      return
    }

    // Normal API call with thinking sounds
    const userMsg = { role: 'user', content: trimmed, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    updateState(VS.PROCESSING)
    play('send')

    const stopTick = await startThinking()

    try {
      const result = await sendMessage(trimmed, currentModeId, { weekNumber })
      stopTick()
      stopThinking()
      if (result) {
        const assistantMsg = {
          role: 'assistant', content: result.text, timestamp: new Date().toISOString(),
          model: result.model, tier: result.tier,
        }
        setMessages(prev => [...prev, assistantMsg])
        play('receive')
        speakJarvis(result.text)
      } else {
        updateState(VS.IDLE)
      }
    } catch (err) {
      console.error('[VoiceMode] Send failed:', err)
      stopTick()
      stopThinking()
      updateState(VS.IDLE)
    }
  }, [sendMessage, currentModeId, weekNumber, play, speakJarvis, updateState, checkIn, onClose, startThinking, stopThinking])

  // ============================================================
  // STT — with voice control + smart silence + voice interruption
  // ============================================================
  const startListening = useCallback(() => {
    if (!SpeechRecognition) return
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        audioStreamRef.current = stream
        setupAnalyser(stream)

        const recognition = new SpeechRecognition()
        recognition.lang = 'en-IN'
        recognition.continuous = true
        recognition.interimResults = true
        recognitionRef.current = recognition

        let finalText = ''

        recognition.onresult = (event) => {
          let transcript = ''
          let isFinal = false
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript
            if (event.results[i].isFinal) isFinal = true
          }

          // Voice control detection (works in any state)
          const control = detectVoiceControl(transcript)
          if (control && isFinal) {
            console.log('VOICE CONTROL:', control.command, '(VoiceMode)')
            if (control.command === 'stop') {
              jarvisStop()
              stopListening()
              setTimeout(() => onClose(), 1500)
            }
            if (control.command === 'send' && finalText) {
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
              try { recognition.stop() } catch { /* ok */ }
              recognitionRef.current = null
              updateState(VS.PROCESSING)
              handleSend(finalText)
            }
            return
          }

          // Voice interruption during speech (3+ words threshold)
          if (voiceStateRef.current === VS.SPEAKING && isFinal) {
            const wc = transcript.trim().split(/\s+/).length
            if (wc >= 3) {
              console.log('INTERRUPT: user spoke during speech, words:', wc)
              window.speechSynthesis?.cancel()
              updateState(VS.LISTENING)
              finalText = transcript
              // Start smart silence for captured speech
              const { delay } = getSilenceDelay(wc)
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
              silenceTimerRef.current = setTimeout(() => {
                try { recognition.stop() } catch { /* ok */ }
                recognitionRef.current = null
                updateState(VS.PROCESSING)
                handleSend(finalText)
              }, delay)
            }
            return
          }

          if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
          timeoutTimerRef.current = setTimeout(() => {
            console.log('TIMEOUT: 15s silence, going IDLE (VoiceMode)')
            stopListening()
          }, 15000)

          if (isFinal) {
            finalText = transcript
            // Smart silence detection
            const wordCount = transcript.trim().split(/\s+/).length
            const { delay } = getSilenceDelay(wordCount)
            console.log(`SILENCE: ${wordCount} words, waiting ${delay / 1000}s (VoiceMode)`)
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = setTimeout(() => {
              try { recognition.stop() } catch { /* ok */ }
              recognitionRef.current = null
              updateState(VS.PROCESSING)
              handleSend(finalText)
            }, delay)
          }
        }

        recognition.onerror = (e) => {
          if (e.error !== 'no-speech' && e.error !== 'aborted') updateState(VS.IDLE)
        }

        recognition.onend = () => {
          const s = voiceStateRef.current
          if ((s === VS.LISTENING || s === VS.SPEAKING) && recognitionRef.current === recognition) {
            try { recognition.start() } catch { /* ok */ }
          }
        }

        recognition.start()
        if (voiceStateRef.current !== VS.SPEAKING) updateState(VS.LISTENING)
      })
      .catch(() => updateState(VS.IDLE))
  }, [updateState, handleSend, setupAnalyser])

  // Keep ref in sync for event listener
  startListeningRef.current = startListening

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
    recognitionRef.current = null
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop())
      audioStreamRef.current = null
    }
    setVoiceLevel(0)
    updateState(VS.IDLE)
  }, [updateState])

  // Auto-start listening on mount
  useEffect(() => {
    const timer = setTimeout(() => startListening(), 300)
    return () => clearTimeout(timer)
  }, [])

  const handleCircleTap = () => {
    if (voiceState === VS.SPEAKING) {
      window.speechSynthesis?.cancel()
      updateState(VS.IDLE)
      setTimeout(() => startListening(), 200)
    } else if (voiceState === VS.LISTENING) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Circle styling
  const circleScale = voiceState === VS.LISTENING ? 1 + voiceLevel * 0.15 : 1
  const circleBorder = voiceState === VS.SPEAKING || voiceState === VS.PROCESSING
    ? '#d4a853' : '#00b4d8'
  const circleGlow = voiceState === VS.SPEAKING || voiceState === VS.PROCESSING
    ? 'rgba(212,168,83,0.3)' : 'rgba(0,180,216,0.3)'

  const stateText = {
    [VS.IDLE]: { text: 'Tap to speak', color: '#5a7a94' },
    [VS.LISTENING]: { text: 'Listening...', color: '#00b4d8' },
    [VS.PROCESSING]: { text: 'Thinking...', color: '#d4a853' },
    [VS.SPEAKING]: { text: 'Speaking...', color: '#d4a853' },
  }[voiceState]

  // Mode pills
  const modePills = ['chat', 'quiz', 'presser', 'teach', 'battle']

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col"
      style={{ backgroundColor: 'rgba(2, 10, 19, 0.98)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2" style={{ flexShrink: 0 }}>
        {/* Mode pills */}
        <div className="flex gap-1.5">
          {modePills.map(id => {
            const m = MODES.find(mode => mode.id === id)
            if (!m) return null
            return (
              <button
                key={id}
                onClick={() => setCurrentModeId(id)}
                className={`font-mono text-[10px] tracking-wider px-2.5 py-1 rounded-full border transition-all
                  ${currentModeId === id
                    ? 'border-cyan/60 bg-cyan/15 text-cyan'
                    : 'border-border text-text-muted hover:border-cyan/30'
                  }`}
              >
                {m.name}
              </button>
            )
          })}
        </div>

        {/* Close */}
        <button
          onClick={() => { jarvisStop(); stopListening(); onClose() }}
          className="p-2 text-text-muted hover:text-text transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Center circle area */}
      <div className="flex-1 flex flex-col items-center justify-center" style={{ minHeight: 0 }}>
        {/* Voice circle */}
        <button
          onClick={handleCircleTap}
          className="relative flex items-center justify-center transition-transform duration-100"
          style={{
            width: 180,
            height: 180,
            borderRadius: '50%',
            border: `3px solid ${circleBorder}`,
            background: `radial-gradient(circle, ${circleGlow} 0%, transparent 70%)`,
            boxShadow: `0 0 30px ${circleGlow}, 0 0 60px ${circleGlow.replace('0.3', '0.1')}`,
            transform: `scale(${circleScale})`,
          }}
        >
          {/* Processing dots */}
          {voiceState === VS.PROCESSING && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex gap-2">
                <span className="w-2.5 h-2.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2.5 h-2.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2.5 h-2.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* Speaking pulse */}
          {voiceState === VS.SPEAKING && (
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                border: `2px solid ${circleBorder}`,
                opacity: 0.4,
              }}
            />
          )}

          {/* Idle breathe */}
          {voiceState === VS.IDLE && (
            <div
              className="absolute inset-0 rounded-full animate-breathe"
              style={{
                border: `1px solid rgba(0,180,216,0.2)`,
              }}
            />
          )}
        </button>

        {/* State text */}
        <p
          className="font-mono text-sm tracking-wider mt-6"
          style={{ color: stateText.color }}
        >
          {stateText.text}
        </p>

        {/* Check-in progress */}
        {checkIn.active && (
          <p className="font-mono text-[10px] text-gold/60 tracking-wider mt-2">
            CHECK-IN: {checkIn.fieldIndex + 1} / {checkIn.totalFields}
          </p>
        )}

        {/* Current mode */}
        <p className="font-mono text-[10px] text-text-muted tracking-widest mt-2">
          {currentMode.emoji} {currentMode.name.toUpperCase()}
        </p>
      </div>

      {/* Transcript area */}
      <div
        className="px-5 pb-5 overflow-y-auto"
        style={{ maxHeight: '35vh', flexShrink: 0 }}
      >
        {messages.length > 0 && (
          <div className="space-y-2">
            {messages.slice(-10).map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`font-body text-xs max-w-[85%] px-3 py-1.5 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-cyan/10 text-cyan/80'
                    : msg.tier >= 2
                      ? 'bg-gold/10 text-gold/80'
                      : 'bg-card text-text-dim'
                }`}>
                  {msg.content?.length > 150 ? msg.content.substring(0, 150) + '...' : msg.content}
                </p>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}
