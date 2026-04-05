// jarvisSpeaker.js — Universal JARVIS Speech Gateway
// WHY: EVERY word JARVIS speaks goes through this single function.
// Pocket-TTS voice server (localhost:8100) first, browser TTS fallback.
// No component should ever call speechSynthesis directly.
//
// Usage:
//   import { jarvisSpeak, jarvisStop } from '../utils/jarvisSpeaker.js'
//   await jarvisSpeak("Good morning, Sir.")

import { parseEmotionTags, stripEmotionTags, getNikhilVoiceContext } from './jarvisVoice.js'

const SERVER_URL = 'http://localhost:8100'
const HEALTH_CACHE_MS = 30000

let _serverOnline = null
let _lastHealthCheck = 0
let _currentAudio = null

// ============================================================
// PHRASE CACHE — pre-generated audio for common phrases
// ============================================================
const _phraseCache = {}
const COMMON_PHRASES = [
  // Acknowledgments
  'Very well, Sir.',
  'Noted, Sir.',
  'Captured, Sir.',
  'As you wish, Sir.',
  'Understood, Sir.',
  'Acknowledged.',
  'Noted.',
  'Very good.',
  'Indeed, Sir.',
  'Quite right, Sir.',
  'Proceeding, Sir.',
  'Of course, Sir.',
  'Consider it done, Sir.',
  'Always, Sir.',
  // Greetings
  'Good morning, Sir.',
  'Good afternoon, Sir.',
  'Good evening, Sir.',
  'Good to see you, Sir.',
  // System
  'All systems online.',
  'Ready when you are, Sir.',
  'At your service, Sir.',
  'Systems operational.',
  'Going silent, Sir.',
  'Standing by, Sir.',
  // Session
  'Session complete. Well done, Sir.',
  'First task of the day. Momentum started.',
  'Capturing, Sir.',
  'Saved, Sir.',
  // Celebrations
  'Well done, Sir.',
  'Impressive, Sir.',
  'Excellent work, Sir.',
  // Check-in
  'How are you feeling today, Sir?',
  'Energy level, Sir. One to five.',
  'Thank you, Sir.',
  // Voice control
  'I encountered an error, Sir. Please try again.',
  // Encouragement
  'You can do this, Sir.',
  'The work speaks for itself, Sir.',
  // Closers
  'Rest well, Sir.',
  'Until tomorrow, Sir.',
  'Goodnight, Sir.',
]

/**
 * Pre-generate common phrases after boot. Call once after ENTER JARVIS click.
 * Runs in background — does not block.
 */
export async function preCacheCommonPhrases() {
  const online = await isServerOnline()
  if (!online) return

  for (const phrase of COMMON_PHRASES) {
    try {
      const res = await fetch(`${SERVER_URL}/speak-simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: phrase }),
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) {
        const blob = await res.blob()
        _phraseCache[phrase] = URL.createObjectURL(blob)
      }
    } catch { /* ok — cache miss is fine */ }
  }
  console.log(`[JARVIS Speaker] Cached ${Object.keys(_phraseCache).length} common phrases`)
}

// ============================================================
// HEALTH CHECK — cached, non-blocking
// ============================================================

async function isServerOnline() {
  const now = Date.now()
  if (_serverOnline !== null && (now - _lastHealthCheck) < HEALTH_CACHE_MS) {
    return _serverOnline
  }
  try {
    const res = await fetch(`${SERVER_URL}/health`, {
      signal: AbortSignal.timeout(1500),
    })
    _serverOnline = res.ok
  } catch {
    _serverOnline = false
  }
  _lastHealthCheck = now
  return _serverOnline
}

/**
 * Pre-warm the server connection. Call on app boot.
 */
export async function preWarmServer() {
  await isServerOnline()
}

// ============================================================
// MAIN — jarvisSpeak
// ============================================================

/**
 * Universal speak function. Every JARVIS utterance goes through here.
 * Pocket-TTS first > browser TTS fallback.
 *
 * @param {string} text — what to say (can include [warm] [clinical] tags)
 * @param {object} options — { speed, skipIfSpeaking }
 * @returns {Promise<boolean>} — true if spoke successfully
 */
export async function jarvisSpeak(text, options = {}) {
  if (!text || text.trim().length === 0) return false

  // Check settings
  try {
    const settings = JSON.parse(localStorage.getItem('jos-settings') || '{}')
    if (settings.voice === false && !options.force) return false
  } catch { /* ok */ }

  // Respect global stop
  window._jarvisStopped = false

  // Skip if already speaking and caller doesn't want to queue
  if (options.skipIfSpeaking && isSpeaking()) return false

  // Check cache first for exact matches (common phrases)
  const trimmed = text.trim()
  const cleanTrimmed = stripEmotionTags(trimmed)
  if (_phraseCache[cleanTrimmed]) {
    return playAudioUrl(_phraseCache[cleanTrimmed])
  }

  // Try Pocket-TTS
  try {
    const settings = JSON.parse(localStorage.getItem('jos-settings') || '{}')
    if (settings.localVoiceServer !== false) {
      const online = await isServerOnline()
      if (online) {
        return await speakViaPocketTTS(text, options)
      }
    }
  } catch { /* ok */ }

  // Fallback: browser TTS
  return speakViaBrowser(text, options)
}

/**
 * Stop ALL speech — Pocket-TTS audio, browser TTS, ElevenLabs audio.
 */
export function jarvisStop() {
  window._jarvisStopped = true
  // Stop Pocket-TTS / any HTML audio
  if (_currentAudio) {
    try { _currentAudio.pause(); _currentAudio.currentTime = 0 } catch { /* ok */ }
    _currentAudio = null
  }
  // Stop ElevenLabs audio (stored globally)
  if (window._jarvisAudio) {
    try { window._jarvisAudio.pause(); window._jarvisAudio.currentTime = 0 } catch { /* ok */ }
    window._jarvisAudio = null
  }
  // Stop all audio elements
  document.querySelectorAll('audio').forEach(a => {
    try { a.pause(); a.currentTime = 0 } catch { /* ok */ }
  })
  // Stop browser TTS
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

/**
 * Is JARVIS currently speaking?
 */
export function isSpeaking() {
  if (_currentAudio && !_currentAudio.paused) return true
  if (window._jarvisAudio && !window._jarvisAudio.paused) return true
  if (window.speechSynthesis?.speaking) return true
  return false
}

// ============================================================
// POCKET-TTS PATH
// ============================================================

async function speakViaPocketTTS(text, options = {}) {
  if (window._jarvisStopped) return false

  try {
    const clean = stripEmotionTags(text)
    // Split into sentences for streaming playback
    const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean]
    const trimmed = sentences.map(s => s.trim()).filter(s => s.length > 0)

    if (trimmed.length === 0) return false

    // Short text (1 sentence or <80 chars): single request, no streaming overhead
    if (trimmed.length === 1 || clean.length < 80) {
      return await speakSingleRequest(clean)
    }

    // Multi-sentence: stream sentence-by-sentence with pre-generation
    console.log(`[JARVIS Speaker] Streaming ${trimmed.length} sentences`)
    let nextBlobPromise = generateSentenceAudio(trimmed[0])

    for (let i = 0; i < trimmed.length; i++) {
      if (window._jarvisStopped) return false

      // Get current sentence audio (already generating or pre-generated)
      const blob = await nextBlobPromise
      if (!blob || window._jarvisStopped) return false

      // Start generating NEXT sentence while current plays
      if (i + 1 < trimmed.length) {
        nextBlobPromise = generateSentenceAudio(trimmed[i + 1])
      }

      // Play current sentence
      const url = URL.createObjectURL(blob)
      await playAudioUrl(url, true)

      // Small gap between sentences
      if (i < trimmed.length - 1 && !window._jarvisStopped) {
        await new Promise(r => setTimeout(r, 200))
      }
    }

    return true
  } catch (err) {
    console.warn('[JARVIS Speaker] Pocket-TTS failed:', err.message)
    _serverOnline = null
    return speakViaBrowser(text, options)
  }
}

/**
 * Generate audio for a single sentence via /speak-simple.
 */
async function generateSentenceAudio(sentence) {
  try {
    const res = await fetch(`${SERVER_URL}/speak-simple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: sentence }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    return await res.blob()
  } catch { return null }
}

/**
 * Single-request path for short text.
 */
async function speakSingleRequest(text) {
  try {
    const res = await fetch(`${SERVER_URL}/speak-simple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok || window._jarvisStopped) return false
    const blob = await res.blob()
    return await playAudioUrl(URL.createObjectURL(blob), true)
  } catch { return false }
}

// ============================================================
// BROWSER TTS FALLBACK
// ============================================================

async function speakViaBrowser(text, options = {}) {
  return new Promise((resolve) => {
    if (window._jarvisStopped || !window.speechSynthesis) { resolve(false); return }

    const clean = stripEmotionTags(text)
      .replace(/[*_~`#]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ', ')
      .replace(/[-]{3,}/g, '')
      .trim()

    if (!clean) { resolve(false); return }

    window.speechSynthesis.cancel()

    const u = new SpeechSynthesisUtterance(clean)
    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find(v => v.name.includes('Google UK English Male'))
      || voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes('male'))
      || voices.find(v => v.lang === 'en-GB')
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0]
    if (voice) u.voice = voice

    try {
      const s = JSON.parse(localStorage.getItem('jos-settings') || '{}')
      u.rate = s.voiceSpeed || 0.95
    } catch { u.rate = 0.95 }
    u.pitch = 0.95

    // Safety timeout
    const timeout = setTimeout(() => resolve(true), Math.max(8000, clean.length * 80))
    u.onend = () => { clearTimeout(timeout); resolve(true) }
    u.onerror = () => { clearTimeout(timeout); resolve(false) }

    window.speechSynthesis.speak(u)
  })
}

// ============================================================
// AUDIO PLAYBACK HELPER
// ============================================================

function playAudioUrl(url, revokeOnEnd = false) {
  return new Promise((resolve) => {
    if (window._jarvisStopped) { resolve(false); return }

    const audio = new Audio(url)
    _currentAudio = audio

    audio.onended = () => {
      if (revokeOnEnd) URL.revokeObjectURL(url)
      _currentAudio = null
      resolve(true)
    }
    audio.onerror = () => {
      if (revokeOnEnd) URL.revokeObjectURL(url)
      _currentAudio = null
      resolve(false)
    }

    audio.play().catch(() => {
      if (revokeOnEnd) URL.revokeObjectURL(url)
      _currentAudio = null
      resolve(false)
    })
  })
}
