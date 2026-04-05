// useJarvisVoice.js — STT + mic control for JARVIS OS
// TTS removed — all speech now through Gemini Live voice.
// This hook handles: microphone, voice commands, silence timer, interruption.

import { useState, useCallback, useRef, useEffect } from 'react'

const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

const VS = { IDLE: 'IDLE', LISTENING: 'LISTENING', PROCESSING: 'PROCESSING', SPEAKING: 'SPEAKING' }

const STOP_WORDS = ['stop', 'jarvis stop', 'enough', 'shut up', 'bas', 'silence']
const WAIT_WORDS = ['wait', 'hold on', 'ruko', 'one second', 'hold']
const SEND_WORDS = ['go', 'send', 'send it', "that's it", 'done', 'bhej do']
const CONTINUE_WORDS = ['continue', 'go on', 'keep going', 'carry on', 'repeat']

function detectControl(transcript) {
  const lower = transcript.toLowerCase().trim()
  if (!lower) return null
  for (const w of STOP_WORDS) { if (lower === w || lower.endsWith(w)) return 'stop' }
  for (const w of WAIT_WORDS) { if (lower === w || lower.endsWith(w)) return 'wait' }
  for (const w of SEND_WORDS) { if (lower === w || lower.endsWith(w)) return 'send' }
  for (const w of CONTINUE_WORDS) { if (lower === w || lower.endsWith(w)) return 'continue' }
  return null
}

function getSilenceDelay(wordCount) {
  if (wordCount < 3) return 3000
  if (wordCount < 8) return 2500
  if (wordCount <= 20) return 2000
  return 1800
}

function jarvisStopAll() {
  window._jarvisStopped = true
  // Stop all audio elements on page
  document.querySelectorAll('audio').forEach(a => { try { a.pause(); a.currentTime = 0 } catch {} })
  if (window._jarvisAudio) { try { window._jarvisAudio.pause(); window._jarvisAudio.currentTime = 0 } catch {}; window._jarvisAudio = null }
  if (window._thinkingStop) { try { window._thinkingStop() } catch {}; window._thinkingStop = null }
}

if (typeof window !== 'undefined') window.jarvisStop = jarvisStopAll

export default function useJarvisVoice() {
  const [voiceState, setVoiceState] = useState(VS.IDLE)
  const [silenceCountdown, setSilenceCountdown] = useState(null)
  const [isWaitMode, setIsWaitMode] = useState(false)

  const stateRef = useRef(VS.IDLE)
  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const countdownRef = useRef(null)
  const timeoutTimerRef = useRef(null)
  const jarvisSpeakingRef = useRef(false)
  const lastInputMethodRef = useRef('typed')
  const userStopTimestampRef = useRef(0)
  const lastResponseRef = useRef('')
  const waitModeRef = useRef(false)
  const recentMsgTimestamps = useRef([])

  const updateState = useCallback((s) => { stateRef.current = s; setVoiceState(s) }, [])

  const stopSpeaking = useCallback(() => {
    jarvisStopAll()
    jarvisSpeakingRef.current = false
    if (recognitionRef.current) {
      stateRef.current = VS.LISTENING; setVoiceState(VS.LISTENING)
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
      timeoutTimerRef.current = setTimeout(() => {
        if (jarvisSpeakingRef.current) return
        if (recognitionRef.current) try { recognitionRef.current.stop() } catch {}
        recognitionRef.current = null; stateRef.current = VS.IDLE; setVoiceState(VS.IDLE)
      }, 30000)
    } else { updateState(VS.IDLE) }
  }, [updateState])

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch {}
    recognitionRef.current = null; setSilenceCountdown(null); updateState(VS.IDLE)
  }, [updateState])

  // speak() — browser TTS fallback for Claude training mode responses
  // Temporary until Claude responses route through Gemini voice
  const speak = useCallback(async (text, options = {}) => {
    lastResponseRef.current = text
    if (!text || text.length < 5) { window.dispatchEvent(new CustomEvent('jarvis-done-speaking')); return }

    // Check if voice is enabled
    try { if (JSON.parse(localStorage.getItem('jos-settings') || '{}').voice === false && !options.isVoiceCommand && !options.isMilestone) { window.dispatchEvent(new CustomEvent('jarvis-done-speaking')); return } } catch {}

    // Only speak for voice-initiated conversations or explicit voice commands
    if (lastInputMethodRef.current !== 'voice' && !options.isVoiceCommand && !options.isMilestone) {
      window.dispatchEvent(new CustomEvent('jarvis-done-speaking')); return
    }

    // Browser TTS fallback
    if (window.speechSynthesis) {
      const clean = text.replace(/\[.*?\]\s*/g, '').replace(/[*_~`#]/g, '').trim()
      if (clean) {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(clean)
        u.lang = 'en-GB'; u.rate = 1.05; u.pitch = 0.95
        const voices = window.speechSynthesis.getVoices()
        const v = voices.find(x => x.lang === 'en-GB') || voices.find(x => x.lang.startsWith('en')) || voices[0]
        if (v) u.voice = v
        u.onend = () => window.dispatchEvent(new CustomEvent('jarvis-done-speaking'))
        u.onerror = () => window.dispatchEvent(new CustomEvent('jarvis-done-speaking'))
        window.speechSynthesis.speak(u)
        return
      }
    }
    window.dispatchEvent(new CustomEvent('jarvis-done-speaking'))
  }, [])

  const executeControl = useCallback((command, currentInput) => {
    if (command === 'stop') {
      jarvisStopAll(); jarvisSpeakingRef.current = false; userStopTimestampRef.current = Date.now()
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
      if (recognitionRef.current) try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null; setSilenceCountdown(null); updateState(VS.IDLE)
    }
    if (command === 'wait') {
      waitModeRef.current = true; setIsWaitMode(true)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      setSilenceCountdown(null)
    }
    if (command === 'send') {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      setSilenceCountdown(null); waitModeRef.current = false; setIsWaitMode(false)
      if (currentInput?.trim()) {
        lastInputMethodRef.current = 'voice'; updateState(VS.PROCESSING)
        window.dispatchEvent(new CustomEvent('jarvis-voice-send', { detail: { text: currentInput.trim() } }))
      }
    }
    if (command === 'continue') {
      if (lastResponseRef.current) speak(lastResponseRef.current, { isVoiceCommand: true })
    }
  }, [updateState, speak])

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch {}
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
    setSilenceCountdown(null); waitModeRef.current = false; setIsWaitMode(false)
    userStopTimestampRef.current = 0; jarvisStopAll()

    setTimeout(() => {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        stream.getTracks().forEach(t => t.stop())
        const recognition = new SpeechRecognition()
        recognition.lang = 'en-IN'; recognition.continuous = true; recognition.interimResults = true; recognition.maxAlternatives = 1
        recognitionRef.current = recognition
        let finalText = ''

        recognition.onresult = (event) => {
          let transcript = ''; let isFinal = false
          for (let i = event.resultIndex; i < event.results.length; i++) { transcript += event.results[i][0].transcript; if (event.results[i].isFinal) isFinal = true }
          if (isFinal) { const ctrl = detectControl(transcript); if (ctrl) { executeControl(ctrl, finalText || transcript); return } }
          if (stateRef.current === VS.SPEAKING && (isFinal || transcript.trim().split(/\s+/).length >= 1)) {
            jarvisStopAll(); jarvisSpeakingRef.current = false; updateState(VS.LISTENING); finalText = transcript
            window.dispatchEvent(new CustomEvent('jarvis-voice-interrupt', { detail: { text: transcript } }))
            startSilenceTimer(transcript); return
          }
          if (stateRef.current === VS.PROCESSING) return
          window.dispatchEvent(new CustomEvent('jarvis-voice-interim', { detail: { text: transcript } }))
          if (stateRef.current === VS.LISTENING) {
            if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
            timeoutTimerRef.current = setTimeout(() => { if (!jarvisSpeakingRef.current) stopListening() }, 30000)
          }
          if (isFinal) { finalText = transcript; if (!waitModeRef.current) startSilenceTimer(transcript) }
        }

        recognition.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') updateState(VS.IDLE) }
        let restartCount = 0
        recognition.onend = () => {
          const s = stateRef.current
          if ((s === VS.LISTENING || s === VS.SPEAKING || s === VS.PROCESSING) && recognitionRef.current === recognition) {
            if (restartCount > 5) { updateState(VS.IDLE); recognitionRef.current = null; return }
            restartCount++; const delay = Math.min(500 * restartCount, 3000)
            setTimeout(() => { if (recognitionRef.current === recognition) try { recognition.start(); restartCount = 0 } catch { updateState(VS.IDLE); recognitionRef.current = null } }, delay)
          }
        }

        recognition.start()
        if (stateRef.current !== VS.SPEAKING && stateRef.current !== VS.PROCESSING) updateState(VS.LISTENING)
        lastInputMethodRef.current = 'voice'
        if (stateRef.current === VS.LISTENING) {
          timeoutTimerRef.current = setTimeout(() => { if (!jarvisSpeakingRef.current) stopListening() }, 30000)
        }
      }).catch(() => updateState(VS.IDLE))
    }, 150)
  }, [updateState, stopListening, executeControl])

  const startSilenceTimer = useCallback((transcript) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    const wordCount = transcript.trim().split(/\s+/).length
    const delay = getSilenceDelay(wordCount)
    let remaining = delay
    const fmt = () => `${wordCount} words · ${(remaining / 1000).toFixed(1)}s`
    setSilenceCountdown(fmt())
    countdownRef.current = setInterval(() => { remaining -= 500; if (remaining > 0) setSilenceCountdown(fmt()) }, 500)
    silenceTimerRef.current = setTimeout(() => {
      if (countdownRef.current) clearInterval(countdownRef.current)
      setSilenceCountdown(null); lastInputMethodRef.current = 'voice'; updateState(VS.PROCESSING)
      window.dispatchEvent(new CustomEvent('jarvis-voice-send', { detail: { text: transcript.trim() } }))
    }, delay)
  }, [updateState])

  const startListeningRef = useRef(null)
  startListeningRef.current = startListening

  useEffect(() => {
    const h = () => {
      const s = JSON.parse(localStorage.getItem('jos-settings') || '{}')
      if (s.autoConversation !== false && lastInputMethodRef.current === 'voice') {
        setTimeout(() => {
          if (recognitionRef.current) { stateRef.current = VS.LISTENING; setVoiceState(VS.LISTENING) }
          else if (startListeningRef.current) startListeningRef.current()
        }, 300)
      }
    }
    window.addEventListener('jarvis-done-speaking', h)
    return () => window.removeEventListener('jarvis-done-speaking', h)
  }, [])

  useEffect(() => { const h = (e) => { if (e.key === 'Escape') executeControl('stop') }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [executeControl])
  useEffect(() => { return () => { if (recognitionRef.current) try { recognitionRef.current.stop() } catch {}; if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current); if (countdownRef.current) clearInterval(countdownRef.current); if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current); jarvisStopAll() } }, [])

  return { voiceState, startListening, stopListening, speak, stopSpeaking, silenceCountdown, isWaitMode, lastInputMethodRef, setTypedInput: () => { lastInputMethodRef.current = 'typed' } }
}

export { VS as VOICE_STATES }
