// useTTS.js — Premium Text-to-Speech with sentence-by-sentence streaming
// WHY: Speaking sentence-by-sentence gives faster perceived response — JARVIS starts
// talking as soon as the first sentence arrives, not after the full response.
// British English voice with Paul Bettany-like pitch. synth.cancel() + 100ms delay
// BEFORE every speak() to prevent overlap. ElevenLabs future-ready.

import { useCallback, useRef } from 'react'
import useStorage from './useStorage.js'

export default function useTTS() {
  const { get } = useStorage()
  const speakingRef = useRef(false)
  const voiceRef = useRef(null)
  const queueRef = useRef([])
  const currentUtteranceRef = useRef(null)

  // WHY: Find the best British English voice. Priority order matches the spec:
  // Google UK English Male > Daniel > en-GB Male > en-GB > any en
  const getBritishVoice = useCallback(() => {
    if (voiceRef.current) return voiceRef.current

    const voices = window.speechSynthesis?.getVoices() || []
    const preferred = [
      voices.find(v => v.name.includes('Google UK English Male')),
      voices.find(v => v.name.includes('Daniel') && v.lang.startsWith('en')),
      voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes('male')),
      voices.find(v => v.lang === 'en-GB'),
      voices.find(v => v.lang.startsWith('en-GB')),
      voices.find(v => v.lang.startsWith('en')),
    ].filter(Boolean)

    voiceRef.current = preferred[0] || null
    return voiceRef.current
  }, [])

  // Cache voice on load
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
      voiceRef.current = null
      getBritishVoice()
    }
  }

  const isVoiceEnabled = useCallback(() => {
    const settings = get('settings') || {}
    return settings.voice === true
  }, [get])

  const getVoiceSpeed = useCallback(() => {
    const settings = get('settings') || {}
    return settings.voiceSpeed || 1.0
  }, [get])

  const hasElevenLabs = useCallback(() => {
    const envKey = import.meta.env?.VITE_ELEVENLABS_API_KEY
    const settingsKey = (get('settings') || {}).elevenLabsKey
    return !!(envKey || settingsKey)
  }, [get])

  const getElevenLabsKey = useCallback(() => {
    return import.meta.env?.VITE_ELEVENLABS_API_KEY || (get('settings') || {}).elevenLabsKey
  }, [get])

  // Split text into sentences for sentence-by-sentence speaking
  const splitSentences = useCallback((text) => {
    // Split on sentence-ending punctuation followed by space or end
    const sentences = text.match(/[^.!?]*[.!?]+[\s]?|[^.!?]+$/g) || [text]
    return sentences.map(s => s.trim()).filter(Boolean)
  }, [])

  // Speak a single sentence via browser TTS — returns promise
  const speakSentence = useCallback((text, onEnd) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis || !text.trim()) {
        resolve()
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      const voice = getBritishVoice()
      if (voice) utterance.voice = voice

      utterance.rate = getVoiceSpeed()
      utterance.pitch = 0.95
      utterance.volume = 0.9

      currentUtteranceRef.current = utterance

      utterance.onend = () => {
        currentUtteranceRef.current = null
        resolve()
      }
      utterance.onerror = (e) => {
        currentUtteranceRef.current = null
        // 'interrupted' is expected when we cancel — not a real error
        if (e.error !== 'interrupted') {
          console.warn('[useTTS] Utterance error:', e.error)
        }
        resolve()
      }

      window.speechSynthesis.speak(utterance)
    })
  }, [getBritishVoice, getVoiceSpeed])

  // WHY: Sentence-by-sentence speaking for faster perceived response.
  // Split response, start speaking first sentence immediately, queue the rest.
  // The onSpeakEnd callback fires when ALL sentences are done — used to
  // transition voice state from SPEAKING → READY.
  const speakBrowser = useCallback(async (text, onSpeakEnd) => {
    if (!window.speechSynthesis) {
      onSpeakEnd?.()
      return
    }

    // CRITICAL: cancel + 100ms delay
    window.speechSynthesis.cancel()
    await new Promise(r => setTimeout(r, 100))

    const sentences = splitSentences(text)
    queueRef.current = [...sentences]
    speakingRef.current = true

    for (const sentence of sentences) {
      // Check if stopped by interruption OR by _briefingStopped flag
      if (!speakingRef.current || window._briefingStopped) {
        console.log('[useTTS] speech loop broken by', !speakingRef.current ? 'speakingRef' : '_briefingStopped')
        break
      }
      await speakSentence(sentence)
    }

    speakingRef.current = false
    queueRef.current = []
    onSpeakEnd?.()
  }, [splitSentences, speakSentence])

  // ElevenLabs speak (for premium moments)
  const speakElevenLabs = useCallback(async (text, onSpeakEnd) => {
    const apiKey = getElevenLabsKey()
    if (!apiKey) return speakBrowser(text, onSpeakEnd)

    try {
      const voiceId = 'onwK4e9ZLuTAKqWW03F9' // Daniel
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.75, similarity_boost: 0.80 },
          }),
        }
      )

      if (!response.ok) {
        console.warn('[useTTS] ElevenLabs failed, falling back to browser')
        return speakBrowser(text, onSpeakEnd)
      }

      // Check briefing flag before playing
      if (window._briefingStopped) {
        console.log('[useTTS] ElevenLabs blocked by _briefingStopped')
        onSpeakEnd?.()
        return
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      // Save global ref so jarvisStop() can kill it
      window._jarvisAudio = audio

      speakingRef.current = true
      await new Promise((resolve) => {
        audio.onended = () => {
          speakingRef.current = false
          window._jarvisAudio = null
          URL.revokeObjectURL(audioUrl)
          resolve()
        }
        audio.onerror = () => {
          speakingRef.current = false
          window._jarvisAudio = null
          URL.revokeObjectURL(audioUrl)
          resolve()
        }
        audio.play().catch(() => {
          speakingRef.current = false
          window._jarvisAudio = null
          resolve()
        })
      })
      onSpeakEnd?.()
    } catch (err) {
      console.warn('[useTTS] ElevenLabs error:', err)
      return speakBrowser(text, onSpeakEnd)
    }
  }, [getElevenLabsKey, speakBrowser])

  // Clean text of markdown for speech
  const cleanForSpeech = useCallback((text) => {
    return text
      .replace(/[*_~`#]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ', ')
      .replace(/[-]{3,}/g, '')
      .trim()
  }, [])

  /**
   * speak — Main TTS function
   * @param {string} text — Text to speak
   * @param {Object} options
   * @param {boolean} options.premium — Use ElevenLabs if available
   * @param {Function} options.onEnd — Callback when speaking finishes
   */
  const speak = useCallback(async (text, options = {}) => {
    // Briefing stop flag — blocks any speech queued before ENTER was clicked
    if (window._briefingStopped) {
      console.log('[useTTS] speak() blocked by _briefingStopped')
      options.onEnd?.()
      return
    }
    if (!isVoiceEnabled()) {
      options.onEnd?.()
      return
    }
    if (!text?.trim()) {
      options.onEnd?.()
      return
    }

    const cleanText = cleanForSpeech(text)

    if (options.premium && hasElevenLabs()) {
      return speakElevenLabs(cleanText, options.onEnd)
    }
    return speakBrowser(cleanText, options.onEnd)
  }, [isVoiceEnabled, hasElevenLabs, speakElevenLabs, speakBrowser, cleanForSpeech])

  // Stop any current speech immediately
  const stop = useCallback(() => {
    speakingRef.current = false
    queueRef.current = []
    currentUtteranceRef.current = null
    window.speechSynthesis?.cancel()
  }, [])

  // Chrome audio unlock — call on user gesture (e.g., "ENTER JARVIS" click)
  const unlockAudio = useCallback(() => {
    // Speak empty utterance to unlock speechSynthesis
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance('')
      window.speechSynthesis.speak(u)
    }
    // Also init AudioContext for Tone.js
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      ctx.resume()
    } catch { /* ok */ }
  }, [])

  return {
    speak,
    stop,
    unlockAudio,
    isSpeaking: speakingRef.current,
    isVoiceEnabled,
    hasElevenLabs,
    getVoiceSpeed,
  }
}
