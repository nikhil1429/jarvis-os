// useVoice.js — Premium Voice State Machine for JARVIS OS
// WHY: A 5-state machine creates natural conversation flow:
// IDLE → LISTENING → PROCESSING → SPEAKING → READY → LISTENING (loop)
// Uses refs for all mutable state to avoid infinite re-render loops.

import { useState, useCallback, useRef, useEffect } from 'react'

const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

export const VOICE_STATES = {
  IDLE: 'IDLE',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  SPEAKING: 'SPEAKING',
  READY: 'READY',
}

export default function useVoice() {
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isSupported] = useState(!!SpeechRecognition)

  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const readyTimeoutRef = useRef(null)
  const onAutoSendRef = useRef(null)
  const finalTranscriptRef = useRef('')
  const stateRef = useRef(VOICE_STATES.IDLE)
  const activeRef = useRef(false)

  // WHY: stateRef mirrors voiceState so callbacks can read current state
  // without depending on voiceState (which would cause re-renders)
  const updateState = useCallback((newState) => {
    stateRef.current = newState
    setVoiceState(newState)
  }, [])

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current)
      readyTimeoutRef.current = null
    }
  }, [])

  // Create recognition instance once
  const getRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current
    if (!SpeechRecognition) return null

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition
    return recognition
  }, [])

  // 1.5s silence detection — auto-sends after user stops speaking
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => {
      if (stateRef.current === VOICE_STATES.LISTENING && finalTranscriptRef.current.trim()) {
        updateState(VOICE_STATES.PROCESSING)
        setTranscript(finalTranscriptRef.current.trim())
        onAutoSendRef.current?.(finalTranscriptRef.current.trim())
        try { recognitionRef.current?.stop() } catch { /* ok */ }
      }
    }, 1500)
  }, [updateState])

  // Start listening
  const startListening = useCallback((onAutoSend) => {
    const recognition = getRecognition()
    if (!recognition) return

    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {})
    }

    clearTimers()
    onAutoSendRef.current = onAutoSend || null
    finalTranscriptRef.current = ''
    activeRef.current = true
    setTranscript('')
    setInterimTranscript('')

    recognition.onresult = (event) => {
      let interim = ''
      let finalText = ''
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript
        } else {
          interim += event.results[i][0].transcript
        }
      }
      if (finalText) {
        finalTranscriptRef.current = finalText
        setTranscript(finalText)
        resetSilenceTimer()
      }
      setInterimTranscript(interim)
    }

    recognition.onend = () => {
      if (stateRef.current === VOICE_STATES.LISTENING && activeRef.current) {
        try { recognition.start() } catch {
          updateState(VOICE_STATES.IDLE)
          activeRef.current = false
        }
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        if (stateRef.current === VOICE_STATES.LISTENING && activeRef.current) {
          try { recognition.start() } catch { /* ok */ }
        }
        return
      }
      console.warn('[useVoice] Error:', event.error)
      updateState(VOICE_STATES.IDLE)
      activeRef.current = false
    }

    try {
      recognition.start()
      updateState(VOICE_STATES.LISTENING)
    } catch {
      try {
        recognition.stop()
        setTimeout(() => {
          try {
            recognition.start()
            updateState(VOICE_STATES.LISTENING)
          } catch { /* give up */ }
        }, 100)
      } catch { /* give up */ }
    }
  }, [getRecognition, clearTimers, resetSilenceTimer, updateState])

  const stopListening = useCallback(() => {
    clearTimers()
    activeRef.current = false
    finalTranscriptRef.current = ''
    try { recognitionRef.current?.stop() } catch { /* ok */ }
    updateState(VOICE_STATES.IDLE)
    setInterimTranscript('')
  }, [clearTimers, updateState])

  const setSpeaking = useCallback(() => {
    clearTimers()
    try { recognitionRef.current?.stop() } catch { /* ok */ }
    updateState(VOICE_STATES.SPEAKING)
    setInterimTranscript('')
    finalTranscriptRef.current = ''
  }, [clearTimers, updateState])

  // READY: auto-reactivate mic after 500ms, 10s timeout to IDLE
  const setReady = useCallback((onAutoSend) => {
    updateState(VOICE_STATES.READY)
    clearTimers()

    if (!activeRef.current) {
      setTimeout(() => {
        if (stateRef.current === VOICE_STATES.READY) {
          updateState(VOICE_STATES.IDLE)
        }
      }, 1000)
      return
    }

    // Read settings directly from localStorage to avoid hook dependency
    let autoConv = true
    try {
      const settings = JSON.parse(localStorage.getItem('jos-settings') || '{}')
      autoConv = settings.autoConversation !== false
    } catch { /* default true */ }

    if (!autoConv) {
      setTimeout(() => {
        if (stateRef.current === VOICE_STATES.READY) {
          updateState(VOICE_STATES.IDLE)
        }
      }, 1000)
      return
    }

    // Auto-reactivate mic after 500ms
    setTimeout(() => {
      if (stateRef.current === VOICE_STATES.READY && activeRef.current) {
        startListening(onAutoSend)
      }
    }, 500)

    // 10s timeout if no speech
    readyTimeoutRef.current = setTimeout(() => {
      if (stateRef.current === VOICE_STATES.LISTENING && activeRef.current) {
        if (!finalTranscriptRef.current.trim()) {
          stopListening()
        }
      }
    }, 10000)
  }, [clearTimers, updateState, startListening, stopListening])

  const handleInterruption = useCallback((onAutoSend) => {
    updateState(VOICE_STATES.LISTENING)
    finalTranscriptRef.current = ''
    setTranscript('')
    setInterimTranscript('')
    onAutoSendRef.current = onAutoSend || null
  }, [updateState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers()
      activeRef.current = false
      try { recognitionRef.current?.stop() } catch { /* ok */ }
    }
  }, [clearTimers])

  return {
    voiceState,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    setSpeaking,
    setReady,
    handleInterruption,
    setTranscript,
    setVoiceState: updateState,
    STATES: VOICE_STATES,
  }
}
