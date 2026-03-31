// ChatView.jsx — Voice-first chat with intelligent speech control
// REDESIGN: Voice-controlled (no keyboard required), smart silence detection,
// speak intelligence (voice in = voice out), natural interruption by speaking,
// ElevenLabs latency fix (show text first, play audio after).
// Works without keyboard: future Raspberry Pi, phone, XR glasses.

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Send, Mic, Zap } from 'lucide-react'
import useAI from '../../hooks/useAI.js'
import useStorage from '../../hooks/useStorage.js'
import useSound from '../../hooks/useSound.js'
import useEventBus from '../../hooks/useEventBus.js'
import useVoiceCheckIn from '../../hooks/useVoiceCheckIn.js'
import { processVoiceCommand } from '../../utils/voiceCommands.js'
import { speakElevenLabs } from '../../utils/elevenLabsSpeak.js'
import { shouldUseElevenLabs } from '../../utils/smartVoiceRouter.js'
import { shouldJarvisSpeak } from '../../utils/speakDecision.js'
import { detectVoiceControl, getSilenceDelay, jarvisStop } from '../../utils/voiceControl.js'

const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

const VS = { IDLE: 'IDLE', LISTENING: 'LISTENING', PROCESSING: 'PROCESSING', SPEAKING: 'SPEAKING' }

export default function ChatView({ mode, weekNumber, onBack, onModeSwitch, autoMic }) {
  const { sendMessage, isStreaming, streamingText, error } = useAI()
  const { get } = useStorage()
  const { play, startThinking, stopThinking } = useSound()
  const eventBus = useEventBus()
  const checkIn = useVoiceCheckIn()
  const modeEnterTime = useRef(Date.now())

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [lastTier, setLastTier] = useState(1)
  const [voiceState, setVoiceState] = useState(VS.IDLE)
  const [silenceCountdown, setSilenceCountdown] = useState(null) // "12 words · 3s"
  const [waitMode, setWaitMode] = useState(false) // user said "wait"

  // Refs
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const countdownRef = useRef(null) // interval for visual countdown
  const timeoutTimerRef = useRef(null)
  const voiceStateRef = useRef(VS.IDLE)
  const lastInputMethodRef = useRef('typed') // 'voice' or 'typed'
  const userStopTimestampRef = useRef(0)
  const recentMsgTimestamps = useRef([]) // for rapidMessages detection
  const lastResponseRef = useRef('') // for "continue" command
  const currentAudioRef = useRef(null) // ElevenLabs Audio element to cancel
  const waitModeRef = useRef(false)
  const startListeningRef = useRef(null) // always holds latest startListening
  const jarvisSpeakingRef = useRef(false) // true while JARVIS audio is playing

  const updateVoiceState = useCallback((newState) => {
    voiceStateRef.current = newState
    setVoiceState(newState)
    console.log('MIC: state changed to', newState)
  }, [])

  // ============================================================
  // SCROLL
  // ============================================================
  useEffect(() => {
    setTimeout(() => {
      const container = messagesContainerRef.current
      if (container) container.scrollTop = container.scrollHeight
    }, 100)
  }, [messages, streamingText])

  // Load message history
  useEffect(() => {
    const history = get(`msgs-${mode.id}`) || []
    setMessages(history)
    modeEnterTime.current = Date.now()
    eventBus.emit('mode:enter', { mode: mode.id })
    return () => {
      const duration = Math.round((Date.now() - modeEnterTime.current) / 1000)
      eventBus.emit('mode:exit', { mode: mode.id, durationSeconds: duration })
      killAllVoice()
    }
  }, [mode.id])

  // Focus + auto-mic
  useEffect(() => {
    inputRef.current?.focus()
    if (autoMic) setTimeout(() => startListening(), 400)
  }, [])

  // External mic activation
  useEffect(() => {
    const h = () => { if (voiceStateRef.current === VS.IDLE) startListening() }
    window.addEventListener('jarvis-activate-mic', h)
    return () => window.removeEventListener('jarvis-activate-mic', h)
  }, [])

  // Auto-reactivation after JARVIS done speaking
  // WHY ref: useEffect([]) captures stale startListening. Ref always has latest.
  useEffect(() => {
    const h = () => {
      console.log('AUTO: jarvis-done-speaking event received')
      const s = JSON.parse(localStorage.getItem('jos-settings') || '{}')
      const autoOn = s.autoConversation !== false // default true if missing
      const wasVoice = lastInputMethodRef.current === 'voice'
      console.log('AUTO: autoConversation=', autoOn, 'lastInput=', lastInputMethodRef.current)
      if (autoOn && wasVoice) {
        console.log('AUTO: reactivating mic in 600ms')
        play('readyChime')
        setTimeout(() => {
          console.log('MIC: auto-reactivating after JARVIS speech')
          // If recognition is already running (headphones mode), just update state + start timeout
          if (recognitionRef.current) {
            console.log('MIC: recognition already active, setting LISTENING + 15s timeout')
            voiceStateRef.current = VS.LISTENING
            setVoiceState(VS.LISTENING)
            if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
            timeoutTimerRef.current = setTimeout(() => {
              if (jarvisSpeakingRef.current) {
                console.log('TIMEOUT: skipped, JARVIS still speaking')
                return
              }
              console.log('TIMEOUT: 15s silence after JARVIS speech, going IDLE')
              if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
              recognitionRef.current = null
              voiceStateRef.current = VS.IDLE
              setVoiceState(VS.IDLE)
            }, 15000)
          } else if (startListeningRef.current) {
            startListeningRef.current()
          }
        }, 600)
      }
    }
    window.addEventListener('jarvis-done-speaking', h)
    return () => window.removeEventListener('jarvis-done-speaking', h)
  }, [])

  // Escape key = stop (backup for keyboard users)
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') {
        console.log('VOICE CONTROL: escape key → stop')
        executeVoiceControl('stop')
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // ============================================================
  // KILL ALL VOICE — cleanup helper
  // ============================================================
  const killAllVoice = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
    recognitionRef.current = null
    if (currentAudioRef.current) {
      try { currentAudioRef.current.pause() } catch { /* ok */ }
      currentAudioRef.current = null
    }
    window.speechSynthesis?.cancel()
    stopThinking()
    setSilenceCountdown(null)
  }, [stopThinking])

  // ============================================================
  // REDESIGN 1: VOICE CONTROL COMMANDS
  // ============================================================
  const executeVoiceControl = useCallback((command) => {
    console.log('VOICE CONTROL:', command, 'detected')

    if (command === 'stop') {
      // IMMEDIATELY kill all audio — browser TTS + ElevenLabs + any Audio elements
      jarvisStop()
      userStopTimestampRef.current = Date.now()
      updateVoiceState(VS.IDLE)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
      if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
      recognitionRef.current = null
      setSilenceCountdown(null)
      stopThinking()
      // Quick browser TTS acknowledgment (after cancel, so it plays clean)
      setTimeout(() => {
        const synth = window.speechSynthesis
        if (synth) {
          const u = new SpeechSynthesisUtterance('Going silent, Sir.')
          let v = window._jarvisVoice
          if (!v) {
            const voices = synth.getVoices()
            v = voices.find(x => x.lang === 'en-GB') || voices.find(x => x.lang.startsWith('en')) || voices[0]
          }
          if (v) u.voice = v
          u.rate = 1.1; u.pitch = 0.95
          synth.speak(u)
        }
      }, 100)
    }

    if (command === 'wait') {
      waitModeRef.current = true
      setWaitMode(true)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      setSilenceCountdown(null)
      // Ack
      const synth = window.speechSynthesis
      if (synth) {
        const u = new SpeechSynthesisUtterance('Standing by, Sir.')
        let v = window._jarvisVoice
        if (v) u.voice = v
        u.rate = 1.1; u.pitch = 0.95
        synth.speak(u)
      }
    }

    if (command === 'send') {
      // Immediately send whatever we have
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      setSilenceCountdown(null)
      waitModeRef.current = false
      setWaitMode(false)
      const text = input.trim()
      if (text) {
        if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
        recognitionRef.current = null
        lastInputMethodRef.current = 'voice'
        updateVoiceState(VS.PROCESSING)
        handleSendDirect(text)
      }
    }

    if (command === 'continue') {
      if (lastResponseRef.current) {
        speakJarvis(lastResponseRef.current, { isVoiceCommand: true })
      }
    }
  }, [input, updateVoiceState])

  // ============================================================
  // Browser TTS helper — speaks an array of sentences
  // ============================================================
  const speakBrowserSentences = useCallback(async (sentences, settings) => {
    const synth = window.speechSynthesis
    if (!synth || sentences.length === 0) return

    synth.cancel()
    await new Promise(r => setTimeout(r, 100))

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
  }, [])

  // ============================================================
  // REDESIGN 3+6: SMART SPEAK — text-first, audio after, speak decision
  // ============================================================
  const speakJarvis = useCallback(async (text, context = {}) => {
    lastResponseRef.current = text
    const settings = JSON.parse(localStorage.getItem('jos-settings') || '{}')

    // Build speak decision context
    const now = Date.now()
    recentMsgTimestamps.current = recentMsgTimestamps.current.filter(t => now - t < 30000)
    const decision = shouldJarvisSpeak({
      ...context,
      voiceOutputEnabled: settings.voice !== false,
      userSaidStop: userStopTimestampRef.current > 0,
      timeSinceStop: now - userStopTimestampRef.current,
      responseLength: text?.length || 0,
      rapidMessages: recentMsgTimestamps.current.length >= 3,
      lastInputWasVoice: lastInputMethodRef.current === 'voice',
      lastInputWasTyped: lastInputMethodRef.current === 'typed',
      isVoiceCommand: context.isVoiceCommand,
      isVoiceCheckIn: checkIn.active,
    })

    console.log('SPEAK DECISION:', decision.speak, 'reason:', decision.reason)

    if (!decision.speak) {
      updateVoiceState(VS.IDLE)
      window.dispatchEvent(new CustomEvent('jarvis-done-speaking'))
      return
    }

    updateVoiceState(VS.SPEAKING)
    jarvisSpeakingRef.current = true
    play('commOpen')

    // Clean text for speech
    const cleanText = text.replace(/[*_~`#]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{2,}/g, '. ').replace(/\n/g, ', ').replace(/[-]{3,}/g, '').trim()
    if (!cleanText) {
      jarvisSpeakingRef.current = false
      play('commClose')
      updateVoiceState(VS.IDLE)
      window.dispatchEvent(new CustomEvent('jarvis-done-speaking'))
      return
    }

    const allSentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText]
    const useEL = shouldUseElevenLabs(text, context)

    if (useEL) {
      // INSTANT FIRST SENTENCE: speak first sentence via browser TTS immediately
      // while ElevenLabs stream loads (1-3s). User hears response in <0.5s.
      const firstSentence = allSentences[0]
      let browserTTSPlaying = false
      const synth = window.speechSynthesis
      if (synth && firstSentence) {
        synth.cancel()
        const utterance = new SpeechSynthesisUtterance(firstSentence.trim())
        let voice = window._jarvisVoice
        if (!voice) {
          const voices = synth.getVoices()
          voice = voices.find(v => v.name.includes('Google UK English Male'))
            || voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes('male'))
            || voices.find(v => v.lang === 'en-GB')
            || voices.find(v => v.lang.startsWith('en')) || voices[0]
          window._jarvisVoice = voice
        }
        if (voice) utterance.voice = voice
        utterance.rate = settings.voiceSpeed || 1.0
        utterance.pitch = 0.95
        synth.speak(utterance)
        browserTTSPlaying = true
        console.log('TTS: instant first sentence via browser while ElevenLabs loads')
      }

      // Full text to ElevenLabs streaming (optimize_streaming_latency:3)
      // elevenLabsSpeak.js cancels browser TTS internally before audio.play()
      const success = await speakElevenLabs(text)

      if (!success) {
        // ElevenLabs failed — speak all via browser TTS
        console.log('TTS: ElevenLabs failed, falling back to browser TTS')
        await speakBrowserSentences(allSentences, settings)
      }
    } else {
      // Browser TTS only (short text, voice commands, no API key)
      await speakBrowserSentences(allSentences, settings)
    }

    jarvisSpeakingRef.current = false
    play('commClose')
    updateVoiceState(VS.IDLE)
    console.log('TTS: speech complete, dispatching jarvis-done-speaking')
    window.dispatchEvent(new CustomEvent('jarvis-done-speaking'))
  }, [updateVoiceState, play, checkIn.active])

  // ============================================================
  // REDESIGN 2+4: STT with smart silence + voice control + background mic
  // ============================================================
  const startListening = useCallback(() => {
    if (!SpeechRecognition) return
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
    setSilenceCountdown(null)
    waitModeRef.current = false
    setWaitMode(false)

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
        let isSpeakingWhenStarted = voiceStateRef.current === VS.SPEAKING

        recognition.onresult = (event) => {
          let transcript = ''
          let isFinal = false
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript
            if (event.results[i].isFinal) isFinal = true
          }

          // REDESIGN 1: Check voice control commands first (works in ANY state)
          const control = detectVoiceControl(transcript)
          if (control && isFinal) {
            setInput('')
            executeVoiceControl(control.command)
            return
          }

          // HEADPHONES MODE: No echo problem — any user speech during SPEAKING = interrupt
          if (voiceStateRef.current === VS.SPEAKING && isFinal) {
            console.log('INTERRUPT: user spoke during JARVIS speech, stopping JARVIS')
            jarvisStop()
            updateVoiceState(VS.LISTENING)
            // Captured speech becomes new input
            setInput(transcript)
            finalText = transcript
            // Start smart silence timer for captured speech
            startSmartSilenceTimer(transcript, recognition)
            return
          }

          // During PROCESSING, only handle voice commands, ignore other speech
          if (voiceStateRef.current === VS.PROCESSING) {
            return
          }

          // Normal LISTENING state
          setInput(transcript)

          // Reset 15s inactivity timeout — but NOT during SPEAKING/PROCESSING
          if (voiceStateRef.current === VS.LISTENING) {
            if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
            timeoutTimerRef.current = setTimeout(() => {
              if (jarvisSpeakingRef.current) {
                console.log('TIMEOUT: skipped, JARVIS still speaking')
                return
              }
              console.log('TIMEOUT: 15s silence, going IDLE')
              stopListening()
            }, 15000)
          }

          if (isFinal) {
            finalText = transcript
            // REDESIGN 2: Smart silence with word count
            if (!waitModeRef.current) {
              startSmartSilenceTimer(transcript, recognition)
            }
          }
        }

        recognition.onerror = (e) => {
          if (e.error !== 'no-speech' && e.error !== 'aborted') updateVoiceState(VS.IDLE)
        }

        recognition.onend = () => {
          // Keep running through LISTENING, PROCESSING, and SPEAKING (continuous mic)
          const s = voiceStateRef.current
          if ((s === VS.LISTENING || s === VS.SPEAKING || s === VS.PROCESSING) && recognitionRef.current === recognition) {
            try { recognition.start() } catch { /* ok */ }
          }
        }

        recognition.start()
        if (voiceStateRef.current !== VS.SPEAKING && voiceStateRef.current !== VS.PROCESSING) {
          updateVoiceState(VS.LISTENING)
        }
        lastInputMethodRef.current = 'voice'
        console.log('MIC: started listening')

        // Only start 15s timeout if actually LISTENING (not during SPEAKING/PROCESSING)
        if (voiceStateRef.current === VS.LISTENING) {
          timeoutTimerRef.current = setTimeout(() => {
            if (jarvisSpeakingRef.current) {
              console.log('TIMEOUT: skipped, JARVIS still speaking')
              return
            }
            console.log('TIMEOUT: 15s silence, going IDLE')
            stopListening()
          }, 15000)
        }
      })
      .catch(() => updateVoiceState(VS.IDLE))
  }, [updateVoiceState])

  // Keep ref in sync so event listeners always call latest version
  startListeningRef.current = startListening

  // Smart silence timer with visual countdown
  const startSmartSilenceTimer = useCallback((transcript, recognition) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)

    const wordCount = transcript.trim().split(/\s+/).length
    const { delay } = getSilenceDelay(wordCount)
    console.log(`SILENCE: ${wordCount} words, waiting ${delay / 1000}s`)

    // Visual countdown: "12 words · Sending in 3..."
    let remaining = delay
    const fmt = (ms) => `${wordCount} words · Sending in ${Math.ceil(ms / 1000)}...`
    setSilenceCountdown(fmt(remaining))
    countdownRef.current = setInterval(() => {
      remaining -= 500
      if (remaining > 0) setSilenceCountdown(fmt(remaining))
    }, 500)

    silenceTimerRef.current = setTimeout(() => {
      if (countdownRef.current) clearInterval(countdownRef.current)
      setSilenceCountdown(null)
      console.log(`SILENCE: sending after ${delay / 1000}s`)
      // DON'T stop recognition — keep mic active through PROCESSING + SPEAKING
      // This enables voice interruption during JARVIS speech (headphones = no echo)
      lastInputMethodRef.current = 'voice'
      updateVoiceState(VS.PROCESSING)
      handleSendDirect(transcript)
    }, delay)
  }, [updateVoiceState])

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
    recognitionRef.current = null
    setSilenceCountdown(null)
    updateVoiceState(VS.IDLE)
  }, [updateVoiceState])

  // ============================================================
  // SEND — with speak decision + thinking sounds
  // ============================================================
  const handleSendDirect = useCallback(async (text) => {
    const trimmed = text?.trim()
    if (!trimmed) return
    setInput('')

    // Track message timing for rapid-typing detection
    recentMsgTimestamps.current.push(Date.now())

    // Voice check-in
    if (checkIn.active) {
      const result = checkIn.processAnswer(trimmed)
      if (result) {
        const msg = { role: 'assistant', content: result.nextPrompt, timestamp: new Date().toISOString() }
        setMessages(prev => [...prev, msg])
        speakJarvis(result.nextPrompt, { isVoiceCommand: true })
      }
      return
    }

    // Voice commands
    const cmd = processVoiceCommand(trimmed)
    if (cmd) {
      const userMsg = { role: 'user', content: trimmed, timestamp: new Date().toISOString() }
      setMessages(prev => [...prev, userMsg])
      if (cmd.type === 'stop') {
        executeVoiceControl('stop')
        return
      }
      if (cmd.type === 'checkin') {
        checkIn.start()
        const msg = { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }
        setMessages(prev => [...prev, msg])
        speakJarvis(cmd.response, { isVoiceCommand: true })
        return
      }
      if (cmd.type === 'mode' && onModeSwitch) {
        const msg = { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }
        setMessages(prev => [...prev, msg])
        speakJarvis(cmd.response, { isVoiceCommand: true })
        setTimeout(() => onModeSwitch(cmd.mode), 1500)
        return
      }
      const msg = { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }
      setMessages(prev => [...prev, msg])
      speakJarvis(cmd.response, { isVoiceCommand: true })
      return
    }

    // Normal API call
    setMessages(prev => [...prev, { role: 'user', content: trimmed, timestamp: new Date().toISOString() }])
    play('send')
    if (voiceStateRef.current !== VS.PROCESSING) updateVoiceState(VS.PROCESSING)

    const stopTick = await startThinking()
    try {
      const result = await sendMessage(trimmed, mode.id, { weekNumber })
      stopTick()
      stopThinking()
      if (result) {
        const assistantMsg = {
          role: 'assistant', content: result.text, timestamp: new Date().toISOString(),
          model: result.model, tier: result.tier, autoUpgraded: result.autoUpgraded, reason: result.reason,
        }
        setMessages(prev => [...prev, assistantMsg])
        setLastTier(result.tier)
        play('receive')
        // REDESIGN 6: Text shown immediately (in messages state), audio fetched after
        speakJarvis(result.text)
      } else {
        updateVoiceState(VS.IDLE)
      }
    } catch (err) {
      console.error('[ChatView] Send failed:', err)
      stopTick(); stopThinking()
      updateVoiceState(VS.IDLE)
    }
  }, [sendMessage, mode.id, weekNumber, play, speakJarvis, updateVoiceState, checkIn, onModeSwitch, stopThinking, startThinking, executeVoiceControl])

  // Input-based send (typed)
  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || isStreaming) return
    stopListening()
    lastInputMethodRef.current = 'typed'
    handleSendDirect(text)
  }, [input, isStreaming, stopListening, handleSendDirect])

  // Mic button: tap to send immediately (skip countdown) or toggle
  const handleMicClick = useCallback(() => {
    if (voiceState === VS.SPEAKING) {
      executeVoiceControl('stop')
    } else if (voiceState === VS.LISTENING) {
      // If there's text and a countdown running → send immediately
      const text = input.trim()
      if (text) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        if (countdownRef.current) clearInterval(countdownRef.current)
        setSilenceCountdown(null)
        if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ok */ }
        recognitionRef.current = null
        lastInputMethodRef.current = 'voice'
        updateVoiceState(VS.PROCESSING)
        handleSendDirect(text)
      } else {
        stopListening()
      }
    } else {
      window.speechSynthesis?.cancel()
      startListening()
    }
  }, [voiceState, input, stopListening, startListening, handleSendDirect, executeVoiceControl, updateVoiceState])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isOpusTier = lastTier >= 2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}
      className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-3" style={{ flexShrink: 0 }}>
        <button onClick={onBack}
          className="flex items-center gap-2 text-text-dim hover:text-cyan transition-colors">
          <ArrowLeft size={18} />
          <span className="font-mono text-xs tracking-wider">BACK</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">{mode.emoji}</span>
          <span className="font-display text-lg font-bold text-text tracking-wider">{mode.name}</span>
        </div>
        <div className="w-20 text-right">
          {isOpusTier && (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-gold bg-gold/10 border border-gold/30 px-2 py-0.5 rounded">
              <Zap size={10} /> OPUS
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="space-y-3 pr-1"
        style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 4px' }}>
        {messages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center" style={{ height: '100%' }}>
            <div className="text-center">
              <span className="text-4xl mb-3 block">{mode.emoji}</span>
              <p className="font-body text-sm text-text-dim">{mode.description}</p>
              <p className="font-mono text-[10px] text-text-muted mt-2 tracking-wider">TYPE OR SPEAK TO BEGIN</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
        {isStreaming && streamingText && (
          <div className={`rounded-lg p-3 border ${isOpusTier ? 'bg-gold/5 border-gold/20' : 'bg-card border-border'}`}>
            <p className={`font-body text-sm whitespace-pre-wrap ${isOpusTier ? 'text-gold' : 'text-cyan'}`}>
              {streamingText}<span className="typewriter-cursor" />
            </p>
          </div>
        )}
        {isStreaming && !streamingText && (
          <div className="flex items-center gap-2 p-3">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="font-mono text-[10px] text-text-muted tracking-wider">JARVIS IS THINKING...</span>
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="font-mono text-xs text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Voice state + silence countdown */}
      <div style={{ flexShrink: 0 }}>
        {voiceState === VS.LISTENING && (
          <div className="flex items-center justify-between mb-1.5 mx-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs animate-pulse">&#127908;</span>
              <span className="font-mono text-[10px] text-cyan tracking-wider animate-pulse">
                {waitMode ? 'Standing by...' : 'Listening...'}
              </span>
            </div>
            {silenceCountdown && (
              <span className="font-mono text-[10px] text-text-muted tracking-wider">
                {silenceCountdown}
              </span>
            )}
          </div>
        )}
        {voiceState === VS.PROCESSING && (
          <div className="flex items-center gap-1.5 mb-1.5 ml-1">
            <span className="text-xs">&#9203;</span>
            <span className="font-mono text-[10px] text-gold tracking-wider animate-pulse">Thinking...</span>
          </div>
        )}
        {voiceState === VS.SPEAKING && (
          <div className="flex items-center justify-between mb-1.5 mx-1">
            <span className="font-mono text-[10px] text-gold tracking-wider animate-pulse">
              &#128266; Speaking... <span className="text-text-muted">(say "stop" to interrupt)</span>
            </span>
          </div>
        )}
        {checkIn.active && (
          <div className="flex items-center gap-1.5 mb-1.5 ml-1">
            <span className="font-mono text-[10px] text-gold/60 tracking-wider">
              CHECK-IN: {checkIn.fieldIndex + 1} / {checkIn.totalFields}
            </span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex gap-2 items-end" style={{ flexShrink: 0 }}>
        <div className="flex-1 relative">
          <input ref={inputRef} type="text" value={input}
            onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={
              voiceState === VS.LISTENING ? (waitMode ? 'Standing by... say "go" to send' : 'Listening...')
              : voiceState === VS.PROCESSING ? 'Processing...'
              : `Message JARVIS (${mode.name} mode)...`
            }
            disabled={isStreaming}
            className={`w-full bg-void border rounded-lg px-4 py-3 font-body text-sm text-text
              placeholder:text-text-muted focus:outline-none transition-all duration-200 disabled:opacity-50 ${
              voiceState === VS.LISTENING ? 'border-cyan shadow-[0_0_12px_rgba(0,180,216,0.3)]'
              : voiceState === VS.SPEAKING ? 'border-gold/40'
              : 'border-border focus:border-cyan'
            }`}
          />
        </div>

        {SpeechRecognition && (JSON.parse(localStorage.getItem('jos-settings') || '{}').voiceInput !== false) && (
          <button onClick={handleMicClick}
            className={`p-3 rounded-lg border transition-all duration-200 ${
              voiceState === VS.LISTENING
                ? 'bg-cyan/15 border-cyan text-cyan animate-pulse shadow-[0_0_12px_rgba(0,180,216,0.3)]'
                : voiceState === VS.SPEAKING
                  ? 'bg-gold/10 border-gold/40 text-gold animate-pulse'
                  : 'border-border text-text-muted hover:border-cyan/40 hover:text-cyan'
            }`}
            aria-label={voiceState === VS.LISTENING ? (silenceCountdown ? 'Send now' : 'Stop') : voiceState === VS.SPEAKING ? 'Stop' : 'Speak'}
          >
            <Mic size={18} />
          </button>
        )}

        <button onClick={handleSend} disabled={!input.trim() || isStreaming}
          className={`p-3 rounded-lg border transition-all duration-200 ${
            input.trim() && !isStreaming
              ? 'bg-cyan/10 border-cyan/40 text-cyan hover:bg-cyan/20'
              : 'bg-card border-border text-text-muted cursor-not-allowed'
          }`} aria-label="Send message">
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const isOpus = message.tier >= 2
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-cyan/10 border border-cyan/20 rounded-lg px-4 py-2.5">
          <p className="font-body text-sm text-text whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className={`max-w-[85%] rounded-lg px-4 py-2.5 border ${isOpus ? 'bg-gold/5 border-gold/20' : 'bg-card border-border'}`}>
        {message.autoUpgraded && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap size={10} className="text-gold" />
            <span className="font-mono text-[9px] text-gold/70 tracking-wider">OPUS — {message.reason}</span>
          </div>
        )}
        <p className={`font-body text-sm whitespace-pre-wrap leading-relaxed ${isOpus ? 'text-gold' : 'text-text'}`}>
          {message.content}
        </p>
        <span className="font-mono text-[9px] text-text-muted mt-1.5 block">
          {new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
