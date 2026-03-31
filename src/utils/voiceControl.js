// voiceControl.js — Real-time voice control word detection
// WHY: User should be able to say "stop" while JARVIS is speaking and it
// stops immediately. No button needed. Works on Raspberry Pi, phone, XR.
// These are checked on EVERY speech recognition result, BEFORE anything else.

const STOP_WORDS = ['stop', 'jarvis stop', 'enough', 'shut up', 'bas', 'stop stop', 'silence']
const WAIT_WORDS = ['wait', 'hold on', 'ruko', 'one second', 'ek second', 'hold']
const SEND_WORDS = ['go', 'send', 'send it', "that's it", 'done', 'bhej do', 'bhej de']
const CONTINUE_WORDS = ['continue', 'go on', 'keep going', 'carry on', 'repeat']

/**
 * Check if transcript is a voice control command
 * @param {string} transcript — raw speech (may be interim)
 * @returns {{ command: string, match: string } | null}
 *   command: 'stop' | 'wait' | 'send' | 'continue'
 */
export function detectVoiceControl(transcript) {
  const lower = transcript.toLowerCase().trim()
  if (!lower) return null

  for (const word of STOP_WORDS) {
    if (lower === word || lower.endsWith(word)) {
      return { command: 'stop', match: word }
    }
  }
  for (const word of WAIT_WORDS) {
    if (lower === word || lower.endsWith(word)) {
      return { command: 'wait', match: word }
    }
  }
  for (const word of SEND_WORDS) {
    if (lower === word || lower.endsWith(word)) {
      return { command: 'send', match: word }
    }
  }
  for (const word of CONTINUE_WORDS) {
    if (lower === word || lower.endsWith(word)) {
      return { command: 'continue', match: word }
    }
  }

  return null
}

/**
 * Global stop — kills ALL audio output from JARVIS.
 * Accessible as window.jarvisStop() from anywhere (console, other components, Escape key).
 * WHY: speechSynthesis.cancel() only kills browser TTS. ElevenLabs creates Audio elements
 * that need separate handling. This one function stops everything.
 */
export function jarvisStop() {
  // Signal streaming to stop
  window._jarvisStopped = true

  // Stop browser TTS
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }

  // Stop ElevenLabs audio via saved reference
  if (window._jarvisAudio) {
    try {
      window._jarvisAudio.pause()
      window._jarvisAudio.currentTime = 0
    } catch { /* ok */ }
    window._jarvisAudio = null
  }

  // Fallback: stop ALL audio elements on page
  document.querySelectorAll('audio').forEach(a => {
    try { a.pause(); a.currentTime = 0 } catch { /* ok */ }
  })

  // Stop thinking tick sounds (saved by useSound.startThinking)
  if (window._thinkingStop) {
    try { window._thinkingStop() } catch { /* ok */ }
    window._thinkingStop = null
  }

  // Stop Tone.js transport (catches any lingering scheduled sounds)
  try {
    const Tone = window.Tone
    if (Tone && Tone.Transport) Tone.Transport.stop()
  } catch { /* ok — Tone may not be loaded */ }

  console.log('JARVIS STOP: everything killed')
}

// Register globally so Escape key handler and console can access it
if (typeof window !== 'undefined') {
  window.jarvisStop = jarvisStop
}

/**
 * Smart silence delay based on word count
 * WHY: Short utterances ("hi") need more wait time (user may still be thinking).
 * Long sentences (15+ words) are complete thoughts — send faster.
 * @param {number} wordCount
 * @returns {{ delay: number, label: string }}
 */
export function getSilenceDelay(wordCount) {
  if (wordCount < 5) return { delay: 4000, label: '4s' }
  if (wordCount <= 15) return { delay: 3000, label: '3s' }
  return { delay: 2500, label: '2.5s' }
}
