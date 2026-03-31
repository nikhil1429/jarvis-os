// elevenLabsSpeak.js — Premium JARVIS voice via ElevenLabs Streaming API
// WHY: The /stream endpoint with optimize_streaming_latency:3 sends audio chunks
// as they're generated. We collect chunks via ReadableStream, then play.
// With latency optimization, first audio arrives in 1-3 seconds instead of 30-40.
// Voice ID: VzHecODY8edPlfzTH2iU — custom JARVIS voice (British, formal, precise)

const JARVIS_VOICE_ID = 'VzHecODY8edPlfzTH2iU'

function getApiKey() {
  const envKey = import.meta.env.VITE_ELEVENLABS_API_KEY
  if (envKey) return envKey
  try {
    return JSON.parse(localStorage.getItem('jos-settings') || '{}').elevenLabsKey || null
  } catch { return null }
}

function cleanForSpeech(text) {
  return text
    .replace(/[*_~`#]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    .replace(/[-]{3,}/g, '')
    .trim()
}

/**
 * Speak text using ElevenLabs streaming API
 * @param {string} text — text to speak
 * @returns {Promise<boolean>} — true if played successfully, false on failure
 */
export async function speakElevenLabs(text) {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.log('11LABS: no API key available')
    return false
  }

  if (window._briefingStopped) {
    console.warn('11LABS: blocked by _briefingStopped — boot transition only')
    return false
  }

  const cleanText = cleanForSpeech(text)
  if (!cleanText) return false

  // Reset stop flag for this speech
  window._jarvisStopped = false

  try {
    console.log('11LABS STREAM: starting, text length:', cleanText.length)
    const startTime = Date.now()

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${JARVIS_VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_flash_v2_5',
          voice_settings: { stability: 0.5, similarity_boost: 0.78 },
          optimize_streaming_latency: 4,
        }),
      }
    )

    if (!response.ok) {
      console.error('11LABS STREAM: error', response.status, response.statusText)
      return false
    }

    // Re-check after fetch
    if (window._briefingStopped || window._jarvisStopped) {
      console.log('11LABS STREAM: stopped during fetch')
      return false
    }

    // Read stream chunks and collect into buffer
    const reader = response.body.getReader()
    const chunks = []
    let firstChunkTime = null

    while (true) {
      if (window._jarvisStopped) {
        console.log('11LABS STREAM: stopped by user during download')
        try { reader.cancel() } catch { /* ok */ }
        return false
      }

      const { done, value } = await reader.read()
      if (done) break

      chunks.push(value)

      if (!firstChunkTime) {
        firstChunkTime = Date.now() - startTime
        console.log('11LABS STREAM: first audio chunk in', firstChunkTime, 'ms')
      }
    }

    if (window._jarvisStopped || window._briefingStopped) {
      console.log('11LABS STREAM: stopped before playback')
      return false
    }

    if (chunks.length === 0) {
      console.warn('11LABS STREAM: no audio data received')
      return false
    }

    // Combine chunks and play
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
    const combined = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }

    const blob = new Blob([combined], { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    window._jarvisAudio = audio

    const totalFetch = Date.now() - startTime
    console.log('11LABS STREAM: total fetch', totalFetch, 'ms, size:', totalLength, 'bytes, playing now')

    return new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url)
        window._jarvisAudio = null
        console.log('11LABS STREAM: playback complete')
        resolve(true)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        window._jarvisAudio = null
        resolve(false)
      }
      audio.onpause = () => {
        if (window._jarvisStopped) {
          URL.revokeObjectURL(url)
          window._jarvisAudio = null
          console.log('11LABS STREAM: playback interrupted by user')
          resolve(false)
        }
      }
      // Kill browser TTS right before ElevenLabs plays — prevents overlap
      window.speechSynthesis?.cancel()
      audio.play().catch(() => {
        URL.revokeObjectURL(url)
        window._jarvisAudio = null
        resolve(false)
      })
    })
  } catch (err) {
    console.error('11LABS STREAM: error', err)
    return false
  }
}
