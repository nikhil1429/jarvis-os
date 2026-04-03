// useJarvisVoice.js — THE voice system for JARVIS OS
// One hook controls everything: STT, TTS routing, voice control, silence timer,
// interruption, auto-reactivation. Replaces useVoice + useTTS + speakDecision +
// voiceControl + smartVoiceRouter.
// Headphones mode: mic stays active through PROCESSING + SPEAKING (no echo).

import { useState, useCallback, useRef, useEffect } from 'react'
import { speakElevenLabs } from '../utils/elevenLabsSpeak.js'

const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

const VS = { IDLE: 'IDLE', LISTENING: 'LISTENING', PROCESSING: 'PROCESSING', SPEAKING: 'SPEAKING' }

// Voice control words
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

// Global stop — kills ALL audio
function jarvisStopAll() {
  window._jarvisStopped = true
  window.speechSynthesis?.cancel()
  if (window._jarvisAudio) {
    try { window._jarvisAudio.pause(); window._jarvisAudio.currentTime = 0 } catch { /* ok */ }
    window._jarvisAudio = null
  }
  document.querySelectorAll('audio').forEach(a => {
    try { a.pause(); a.currentTime = 0 } catch { /* ok */ }
  })
  if (window._thinkingStop) { try { window._thinkingStop() } catch { /* ok */ }; window._thinkingStop = null }
  console.log('JARVIS STOP: everything killed')
}

// Register globally
if (typeof window !== 'undefined') window.jarvisStop = jarvisStopAll

// Browser TTS for short acks only
function speakBrowserAck(text) {
  const synth = window.speechSynthesis
  if (!synth) return
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  let v = window._jarvisVoice
  if (!v) {
    const voices = synth.getVoices()
    v = voices.find(x => x.lang === 'en-GB') || voices.find(x => x.lang.startsWith('en')) || voices[0]
    window._jarvisVoice = v
  }
  if (v) u.voice = v
  u.rate = 1.1; u.pitch = 0.95
  synth.speak(u)
}

// Browser TTS fallback for full responses — speaks sentences ONE AT A TIME
// V4 fix: sequential playback so cancel() reliably stops between sentences
function speakBrowserFallback(text) {
  return new Promise(async (resolve) => {
    const synth = window.speechSynthesis
    if (!synth) { resolve(); return }
    const clean = text.replace(/[*_~`#]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{2,}/g, '. ').replace(/\n/g, ', ').replace(/[-]{3,}/g, '').trim()
    if (!clean) { resolve(); return }
    synth.cancel()
    const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean]
    let v = window._jarvisVoice
    if (!v) {
      const voices = synth.getVoices()
      v = voices.find(x => x.name.includes('Google UK English Male'))
        || voices.find(x => x.lang === 'en-GB') || voices.find(x => x.lang.startsWith('en')) || voices[0]
      window._jarvisVoice = v
    }

    for (const sentence of sentences) {
      if (window._jarvisStopped) break
      await new Promise(sentenceResolve => {
        const u = new SpeechSynthesisUtterance(sentence.trim())
        if (v) u.voice = v
        u.rate = 1.0; u.pitch = 0.95
        u.onend = sentenceResolve
        u.onerror = sentenceResolve
        // Safety timeout per sentence
        const timer = setTimeout(sentenceResolve, Math.max(8000, sentence.length * 80))
        u.onend = () => { clearTimeout(timer); sentenceResolve() }
        u.onerror = () => { clearTimeout(timer); sentenceResolve() }
        synth.speak(u)
      })
    }
    resolve()
  })
}

export default function useJarvisVoice() {
  const [voiceState, setVoiceState] = useState(VS.IDLE)
  const [silenceCountdown, setSilenceCountdown] = useState(null)
  const [isWaitMode, setIsWaitMode] = useState(false)

  // All mutable state in refs to avoid stale closures in timers/callbacks
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

  const updateState = useCallback((s) => {
    stateRef.current = s
    setVoiceState(s)
  }, [])

  // ============================================================
  // STOP SPEAKING
  // ============================================================
  const stopSpeaking = useCallback(() => {
    jarvisStopAll()
    jarvisSpeakingRef.current = false
    // Go to LISTENING (not IDLE) so mic stays alive for continued conversation
    // The 15s silence timeout will handle going to IDLE if user doesn't speak
    if (recognitionRef.current) {
      stateRef.current = VS.LISTENING
      setVoiceState(VS.LISTENING)
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
      timeoutTimerRef.current = setTimeout(() => {
        if (jarvisSpeakingRef.current) return
        console.log('TIMEOUT: 30s after stop-speaking, going IDLE')
        if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
        recognitionRef.current = null
        stateRef.current = VS.IDLE
        setVoiceState(VS.IDLE)
      }, 30000)
    } else {
      updateState(VS.IDLE)
    }
  }, [updateState])

  // ============================================================
  // STOP LISTENING
  // ============================================================
  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
    recognitionRef.current = null
    setSilenceCountdown(null)
    updateState(VS.IDLE)
  }, [updateState])

  // ============================================================
  // SPEAK — ElevenLabs only, browser TTS fallback
  // ============================================================
  const speak = useCallback(async (text, options = {}) => {
    lastResponseRef.current = text
    const settings = JSON.parse(localStorage.getItem('jos-settings') || '{}')

    // Speak decision
    const now = Date.now()
    recentMsgTimestamps.current = recentMsgTimestamps.current.filter(t => now - t < 30000)
    const shouldSpeak = (() => {
      if (options.isMilestone || options.isBriefing || options.isRankUp) return true
      if (settings.voice === false) return false
      if (options.isVoiceCommand) return true
      // If user is in a voice conversation, ALWAYS speak (skip suppression checks)
      if (lastInputMethodRef.current === 'voice') return true
      if (userStopTimestampRef.current > 0 && now - userStopTimestampRef.current < 60000) return false
      if (!text || text.length < 5) return false
      if (recentMsgTimestamps.current.length >= 8) return false
      if (lastInputMethodRef.current === 'typed') return false
      return false
    })()

    console.log('SPEAK DECISION:', shouldSpeak, 'lastInput:', lastInputMethodRef.current)

    if (!shouldSpeak) {
      updateState(VS.IDLE)
      window.dispatchEvent(new CustomEvent('jarvis-done-speaking'))
      return
    }

    updateState(VS.SPEAKING)
    jarvisSpeakingRef.current = true
    window._jarvisStopped = false

    // ElevenLabs for all responses
    const success = await speakElevenLabs(text)
    if (!success && jarvisSpeakingRef.current) {
      console.log('TTS: ElevenLabs failed, browser TTS fallback')
      await speakBrowserFallback(text)
    }

    jarvisSpeakingRef.current = false
    if (stateRef.current === VS.SPEAKING) {
      updateState(VS.IDLE)
      console.log('TTS: speech complete, dispatching jarvis-done-speaking')
      window.dispatchEvent(new CustomEvent('jarvis-done-speaking'))
    } else {
      console.log('TTS: speech ended but state already changed to', stateRef.current, '(interrupted)')
    }
  }, [updateState])

  // ============================================================
  // VOICE CONTROL EXECUTION
  // ============================================================
  const executeControl = useCallback((command, currentInput) => {
    console.log('VOICE CONTROL:', command)

    if (command === 'stop') {
      jarvisStopAll()
      jarvisSpeakingRef.current = false
      userStopTimestampRef.current = Date.now()
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
      if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
      recognitionRef.current = null
      setSilenceCountdown(null)
      updateState(VS.IDLE)
      setTimeout(() => speakBrowserAck('Going silent, Sir.'), 100)
    }

    if (command === 'wait') {
      waitModeRef.current = true
      setIsWaitMode(true)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      setSilenceCountdown(null)
      speakBrowserAck('Standing by, Sir.')
    }

    if (command === 'send') {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      setSilenceCountdown(null)
      waitModeRef.current = false
      setIsWaitMode(false)
      if (currentInput?.trim()) {
        lastInputMethodRef.current = 'voice'
        updateState(VS.PROCESSING)
        window.dispatchEvent(new CustomEvent('jarvis-voice-send', { detail: { text: currentInput.trim() } }))
      }
    }

    if (command === 'continue') {
      if (lastResponseRef.current) speak(lastResponseRef.current, { isVoiceCommand: true })
    }
  }, [updateState, speak])

  // ============================================================
  // START LISTENING
  // ============================================================
  const startListening = useCallback(() => {
    if (!SpeechRecognition) return
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
    setSilenceCountdown(null)
    waitModeRef.current = false
    setIsWaitMode(false)
    userStopTimestampRef.current = 0 // V2 fix: clear stop suppression on new voice session

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach(t => t.stop())

        const recognition = new SpeechRecognition()
        recognition.lang = 'en-IN'
        recognition.continuous = true
        recognition.interimResults = true
        recognition.maxAlternatives = 1
        recognitionRef.current = recognition

        let finalText = ''

        recognition.onresult = (event) => {
          let transcript = ''
          let isFinal = false
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript
            if (event.results[i].isFinal) isFinal = true
          }

          // Voice control — works in ANY state
          if (isFinal) {
            const ctrl = detectControl(transcript)
            if (ctrl) {
              executeControl(ctrl, finalText || transcript)
              return
            }
          }

          // Interruption during SPEAKING — any speech with 1+ words = real user (interim or final)
          if (stateRef.current === VS.SPEAKING && (isFinal || transcript.trim().split(/\s+/).length >= 1)) {
            console.log('INTERRUPT: user spoke during JARVIS speech')
            jarvisStopAll()
            jarvisSpeakingRef.current = false
            updateState(VS.LISTENING)
            finalText = transcript
            window.dispatchEvent(new CustomEvent('jarvis-voice-interrupt', { detail: { text: transcript } }))
            // Start silence timer for captured speech
            startSilenceTimer(transcript, recognition)
            return
          }

          // During PROCESSING — ignore non-control speech
          if (stateRef.current === VS.PROCESSING) return

          // Normal LISTENING
          // Dispatch interim for UI display
          window.dispatchEvent(new CustomEvent('jarvis-voice-interim', { detail: { text: transcript } }))

          // 15s timeout only in LISTENING state
          if (stateRef.current === VS.LISTENING) {
            if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
            timeoutTimerRef.current = setTimeout(() => {
              if (jarvisSpeakingRef.current) { console.log('TIMEOUT: skipped, JARVIS speaking'); return }
              console.log('TIMEOUT: 30s silence, going IDLE')
              stopListening()
            }, 30000)
          }

          if (isFinal) {
            finalText = transcript
            if (!waitModeRef.current) {
              startSilenceTimer(transcript, recognition)
            }
          }
        }

        recognition.onerror = (e) => {
          if (e.error !== 'no-speech' && e.error !== 'aborted') updateState(VS.IDLE)
        }

        // Keep mic alive through LISTENING, PROCESSING, SPEAKING
        // V9 fix: backoff on rapid restarts to prevent deaf-mic loop
        let restartCount = 0
        recognition.onend = () => {
          const s = stateRef.current
          if ((s === VS.LISTENING || s === VS.SPEAKING || s === VS.PROCESSING) && recognitionRef.current === recognition) {
            if (restartCount > 5) {
              console.warn('MIC: too many restarts, going IDLE')
              updateState(VS.IDLE)
              recognitionRef.current = null
              return
            }
            restartCount++
            const delay = Math.min(500 * restartCount, 3000)
            setTimeout(() => {
              if (recognitionRef.current === recognition) {
                try { recognition.start(); restartCount = 0 } catch { updateState(VS.IDLE); recognitionRef.current = null }
              }
            }, delay)
          }
        }

        recognition.start()
        if (stateRef.current !== VS.SPEAKING && stateRef.current !== VS.PROCESSING) {
          updateState(VS.LISTENING)
        }
        lastInputMethodRef.current = 'voice'
        console.log('MIC: started listening')

        // Initial 15s timeout
        if (stateRef.current === VS.LISTENING) {
          timeoutTimerRef.current = setTimeout(() => {
            if (jarvisSpeakingRef.current) return
            console.log('TIMEOUT: 30s silence, going IDLE')
            stopListening()
          }, 30000)
        }
      })
      .catch(() => updateState(VS.IDLE))
  }, [updateState, stopListening, executeControl])

  // Smart silence timer with countdown
  const startSilenceTimer = useCallback((transcript, recognition) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)

    const wordCount = transcript.trim().split(/\s+/).length
    const delay = getSilenceDelay(wordCount)
    console.log(`SILENCE: ${wordCount} words, waiting ${delay}ms`)

    let remaining = delay
    const fmt = () => `${wordCount} words · ${(remaining / 1000).toFixed(1)}s`
    setSilenceCountdown(fmt())
    countdownRef.current = setInterval(() => {
      remaining -= 500
      if (remaining > 0) setSilenceCountdown(fmt())
    }, 500)

    silenceTimerRef.current = setTimeout(() => {
      if (countdownRef.current) clearInterval(countdownRef.current)
      setSilenceCountdown(null)
      console.log('SILENCE: sending')
      lastInputMethodRef.current = 'voice'
      updateState(VS.PROCESSING)
      window.dispatchEvent(new CustomEvent('jarvis-voice-send', { detail: { text: transcript.trim() } }))
    }, delay)
  }, [updateState])

  // Keep startListening ref fresh for event listeners
  const startListeningRef = useRef(null)
  startListeningRef.current = startListening

  // Auto-reactivation after JARVIS done speaking
  useEffect(() => {
    const h = () => {
      console.log('AUTO: jarvis-done-speaking received')
      const s = JSON.parse(localStorage.getItem('jos-settings') || '{}')
      if (s.autoConversation !== false && lastInputMethodRef.current === 'voice') {
        console.log('AUTO: reactivating mic in 300ms')
        setTimeout(() => {
          if (recognitionRef.current) {
            // Mic already active — just set state + timeout
            stateRef.current = VS.LISTENING
            setVoiceState(VS.LISTENING)
            if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
            timeoutTimerRef.current = setTimeout(() => {
              if (jarvisSpeakingRef.current) return
              console.log('TIMEOUT: 30s silence after speech, going IDLE')
              if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
              recognitionRef.current = null
              stateRef.current = VS.IDLE
              setVoiceState(VS.IDLE)
            }, 30000)
          } else if (startListeningRef.current) {
            startListeningRef.current()
          }
        }, 300)
      }
    }
    window.addEventListener('jarvis-done-speaking', h)
    return () => window.removeEventListener('jarvis-done-speaking', h)
  }, [])

  // Escape key → stop
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') executeControl('stop') }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [executeControl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
      jarvisStopAll()
    }
  }, [])

  return {
    voiceState,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    silenceCountdown,
    isWaitMode,
    lastInputMethodRef,
    setTypedInput: () => { lastInputMethodRef.current = 'typed' },
  }
}

export { VS as VOICE_STATES }
