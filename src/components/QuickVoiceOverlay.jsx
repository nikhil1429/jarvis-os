// QuickVoiceOverlay.jsx — Slide-down voice panel visible on any tab
// WHY: Clicking the global mic should NOT navigate away. This overlay sits on top
// of the current tab with a proper panel UI: state indicator, last 3 messages,
// progress bar. Auto-hides 5s after going idle. Stays on current screen.

import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import useAI from '../hooks/useAI.js'
import useSound from '../hooks/useSound.js'
import useVoiceCheckIn from '../hooks/useVoiceCheckIn.js'
import { processVoiceCommand } from '../utils/voiceCommands.js'
import { speakElevenLabs } from '../utils/elevenLabsSpeak.js'
import { shouldUseElevenLabs } from '../utils/smartVoiceRouter.js'
import { detectVoiceControl, getSilenceDelay, jarvisStop } from '../utils/voiceControl.js'

const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

const VS = { IDLE: 'IDLE', LISTENING: 'LISTENING', PROCESSING: 'PROCESSING', SPEAKING: 'SPEAKING' }

export default function QuickVoiceOverlay({ onClose }) {
  const { sendMessage } = useAI()
  const { play, startThinking, stopThinking } = useSound()
  const checkIn = useVoiceCheckIn()

  const [voiceState, setVoiceState] = useState(VS.IDLE)
  const [messages, setMessages] = useState([])
  const [visible, setVisible] = useState(false)
  const [silenceCountdown, setSilenceCountdown] = useState(null) // "Sending in 3..."

  const voiceStateRef = useRef(VS.IDLE)
  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const countdownRef = useRef(null)
  const timeoutTimerRef = useRef(null)
  const autoHideTimerRef = useRef(null)
  const startListeningRef = useRef(null)

  const updateState = useCallback((s) => {
    voiceStateRef.current = s
    setVoiceState(s)
  }, [])

  // Slide in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current)
      jarvisStop()
      stopThinking()
    }
  }, [stopThinking])

  // Auto-hide ONLY after 8 seconds of true IDLE (no listening, no speaking, no processing)
  // Stay open during LISTENING → PROCESSING → SPEAKING → LISTENING cycle
  useEffect(() => {
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current)
    const shouldStayOpen = voiceState !== VS.IDLE
    console.log('OVERLAY: state changed to', voiceState, 'staying open:', shouldStayOpen || messages.length === 0)
    if (voiceState === VS.IDLE && messages.length > 0) {
      autoHideTimerRef.current = setTimeout(() => handleClose(), 8000)
    }
    return () => { if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current) }
  }, [voiceState, messages.length])

  // Auto-reactivation — uses ref for fresh startListening
  useEffect(() => {
    const handler = () => {
      console.log('AUTO: jarvis-done-speaking received (QuickVoice)')
      const s = JSON.parse(localStorage.getItem('jos-settings') || '{}')
      if (s.autoConversation !== false) {
        console.log('AUTO: reactivating mic in 600ms (QuickVoice)')
        setTimeout(() => {
          if (startListeningRef.current) startListeningRef.current()
        }, 600)
      }
    }
    window.addEventListener('jarvis-done-speaking', handler)
    return () => window.removeEventListener('jarvis-done-speaking', handler)
  }, [])

  const handleClose = useCallback(() => {
    jarvisStop()
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
    recognitionRef.current = null
    stopThinking()
    setVisible(false)
    setTimeout(() => onClose(), 300)
  }, [onClose, stopThinking])

  // ============================================================
  // SPEAK — uses smart router
  // ============================================================
  const speak = useCallback(async (text, context = {}) => {
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
    if (useEL) success = await speakElevenLabs(text)

    if (!success) {
      const synth = window.speechSynthesis
      const cleanText = text.replace(/[*_~`#]/g, '').replace(/\n{2,}/g, '. ').replace(/\n/g, ', ').trim()
      if (synth && cleanText) {
        synth.cancel()
        await new Promise(r => setTimeout(r, 100))
        const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText]
        let voice = window._jarvisVoice
        if (!voice) {
          const voices = synth.getVoices()
          voice = voices.find(v => v.name.includes('Google UK English Male'))
            || voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes('male'))
            || voices.find(v => v.lang === 'en-GB')
            || voices.find(v => v.lang.startsWith('en')) || voices[0]
          window._jarvisVoice = voice
        }
        await new Promise((resolve) => {
          sentences.forEach((sentence, i) => {
            const utterance = new SpeechSynthesisUtterance(sentence.trim())
            utterance.voice = voice
            utterance.rate = settings.voiceSpeed || 1.0
            utterance.pitch = 0.95
            if (i === sentences.length - 1) { utterance.onend = resolve; utterance.onerror = resolve }
            synth.speak(utterance)
          })
        })
      }
    }

    play('commClose')
    updateState(VS.IDLE)
    window.dispatchEvent(new CustomEvent('jarvis-done-speaking'))
  }, [updateState, play])

  // ============================================================
  // SEND
  // ============================================================
  const handleSend = useCallback(async (text) => {
    const trimmed = text?.trim()
    if (!trimmed) return

    if (checkIn.active) {
      const result = checkIn.processAnswer(trimmed)
      if (result) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.nextPrompt, ts: Date.now() }].slice(-3))
        await speak(result.nextPrompt, { isVoiceCommand: true })
      }
      return
    }

    const cmd = processVoiceCommand(trimmed)
    if (cmd) {
      setMessages(prev => [...prev, { role: 'user', content: trimmed, ts: Date.now() }].slice(-3))
      if (cmd.type === 'stop') { jarvisStop(); handleClose(); return }
      if (cmd.type === 'checkin') {
        checkIn.start()
        setMessages(prev => [...prev, { role: 'assistant', content: cmd.response, ts: Date.now() }].slice(-3))
        await speak(cmd.response, { isVoiceCommand: true })
        return
      }
      if (cmd.type === 'mode') {
        setMessages(prev => [...prev, { role: 'assistant', content: cmd.response, ts: Date.now() }].slice(-3))
        await speak(cmd.response, { isVoiceCommand: true })
        window.dispatchEvent(new CustomEvent('jarvis-open-mode', { detail: { mode: cmd.mode } }))
        return
      }
      setMessages(prev => [...prev, { role: 'assistant', content: cmd.response, ts: Date.now() }].slice(-3))
      await speak(cmd.response, { isVoiceCommand: true })
      return
    }

    // Normal API call
    setMessages(prev => [...prev, { role: 'user', content: trimmed, ts: Date.now() }].slice(-3))
    updateState(VS.PROCESSING)
    const stopTick = await startThinking()

    try {
      const result = await sendMessage(trimmed, 'chat', {})
      stopTick(); stopThinking()
      if (result) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.text, ts: Date.now(), tier: result.tier }].slice(-3))
        await speak(result.text)
      } else { updateState(VS.IDLE) }
    } catch (err) {
      console.error('[QuickVoice] Send failed:', err)
      stopTick(); stopThinking(); updateState(VS.IDLE)
    }
  }, [sendMessage, speak, updateState, checkIn, handleClose, startThinking, stopThinking])

  // ============================================================
  // STT
  // ============================================================
  const startListening = useCallback(() => {
    if (!SpeechRecognition) return
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current)

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach(t => t.stop())
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

          const control = detectVoiceControl(transcript)
          if (control && isFinal) {
            console.log('VOICE CONTROL:', control.command, '(QuickVoice)')
            if (control.command === 'stop') { jarvisStop(); handleClose(); return }
            if (control.command === 'send' && finalText) {
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
              try { recognition.stop() } catch { /* ok */ }
              recognitionRef.current = null
              handleSend(finalText)
              return
            }
          }

          if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
          timeoutTimerRef.current = setTimeout(() => stopListeningInternal(), 15000)

          if (isFinal) {
            finalText = transcript
            const wordCount = transcript.trim().split(/\s+/).length
            const { delay } = getSilenceDelay(wordCount)
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
            if (countdownRef.current) clearInterval(countdownRef.current)

            // Visual countdown: "Sending in 3... 2... 1..."
            let remaining = delay
            setSilenceCountdown(`Sending in ${Math.ceil(remaining / 1000)}...`)
            countdownRef.current = setInterval(() => {
              remaining -= 1000
              if (remaining > 0) setSilenceCountdown(`Sending in ${Math.ceil(remaining / 1000)}...`)
            }, 1000)

            silenceTimerRef.current = setTimeout(() => {
              if (countdownRef.current) clearInterval(countdownRef.current)
              setSilenceCountdown(null)
              try { recognition.stop() } catch { /* ok */ }
              recognitionRef.current = null
              handleSend(finalText)
            }, delay)
          }
        }

        recognition.onerror = (e) => {
          if (e.error !== 'no-speech' && e.error !== 'aborted') updateState(VS.IDLE)
        }
        recognition.onend = () => {
          if (voiceStateRef.current === VS.LISTENING && recognitionRef.current === recognition) {
            try { recognition.start() } catch { /* ok */ }
          }
        }

        recognition.start()
        updateState(VS.LISTENING)
        play('readyChime')
      })
      .catch(() => updateState(VS.IDLE))
  }, [updateState, handleSend, play, handleClose])

  // Keep ref in sync
  startListeningRef.current = startListening

  const stopListeningInternal = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
    recognitionRef.current = null
    updateState(VS.IDLE)
  }, [updateState])

  // Auto-start on mount
  useEffect(() => {
    const timer = setTimeout(() => startListening(), 200)
    return () => clearTimeout(timer)
  }, [])

  // State display config
  const stateDisplay = {
    [VS.IDLE]: { icon: '', text: '', color: '' },
    [VS.LISTENING]: { icon: '\u{1F3A4}', text: 'Listening...', color: '#00b4d8' },
    [VS.PROCESSING]: { icon: '\u23F3', text: 'Processing...', color: '#d4a853' },
    [VS.SPEAKING]: { icon: '\u{1F50A}', text: 'JARVIS speaking...', color: '#d4a853' },
  }[voiceState]

  const barColor = voiceState === VS.LISTENING ? '#00b4d8'
    : voiceState === VS.SPEAKING ? '#d4a853'
    : voiceState === VS.PROCESSING ? '#d4a853'
    : 'transparent'

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(2, 10, 19, 0.95)',
        borderBottom: '1px solid rgba(0, 180, 216, 0.3)',
        backdropFilter: 'blur(12px)',
        minHeight: 120,
        maxHeight: '40vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 20px',
        gap: 12,
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
      }}
    >
      {/* TOP ROW: state + close */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {voiceState !== VS.IDLE && (
            <>
              <span style={{ fontSize: 16 }}>{stateDisplay.icon}</span>
              <span
                className="animate-pulse"
                style={{
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: 13,
                  letterSpacing: '0.08em',
                  color: stateDisplay.color,
                }}
              >
                {stateDisplay.text}
                {silenceCountdown && (
                  <span style={{ marginLeft: 8, color: '#5a7a94' }}>{silenceCountdown}</span>
                )}
              </span>
            </>
          )}
          {voiceState === VS.IDLE && messages.length === 0 && (
            <span style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 13,
              color: '#5a7a94',
              letterSpacing: '0.08em',
            }}>
              Tap mic or speak...
            </span>
          )}
          {checkIn.active && (
            <span style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 10,
              color: 'rgba(212, 168, 83, 0.6)',
              marginLeft: 8,
            }}>
              CHECK-IN {checkIn.fieldIndex + 1}/{checkIn.totalFields}
            </span>
          )}
        </div>

        <button
          onClick={handleClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 6, color: '#5a7a94', display: 'flex',
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* MIDDLE: messages (last 3) */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {messages.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.slice(-3).map((msg, i) => (
              <div key={i} style={{ textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                <span style={{
                  display: 'inline-block',
                  maxWidth: '85%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: 'Exo 2, sans-serif',
                  lineHeight: 1.4,
                  ...(msg.role === 'user'
                    ? { background: 'rgba(0, 180, 216, 0.1)', color: 'rgba(0, 180, 216, 0.85)' }
                    : msg.tier >= 2
                      ? { background: 'rgba(212, 168, 83, 0.1)', color: 'rgba(212, 168, 83, 0.85)' }
                      : { background: 'rgba(6, 20, 34, 1)', color: '#d0e8f8' }
                  ),
                }}>
                  {msg.content?.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM: progress bar */}
      <div style={{
        width: '100%', height: 3, borderRadius: 2,
        background: 'rgba(13, 33, 55, 0.8)', flexShrink: 0, overflow: 'hidden',
      }}>
        {voiceState !== VS.IDLE && (
          <div
            className="animate-pulse"
            style={{
              height: '100%',
              borderRadius: 2,
              background: barColor,
              width: voiceState === VS.PROCESSING ? '66%' : '100%',
              transition: 'width 0.5s ease',
            }}
          />
        )}
      </div>
    </div>
  )
}
