// smartVoiceRouter.js — Decides ElevenLabs vs browser TTS
// WHY: ElevenLabs costs credits per character. We use it strategically:
// - Milestones, rank-ups, briefings = always ElevenLabs (cinematic moments)
// - Voice commands = always browser TTS (instant response needed)
// - Short text (<80 chars) = browser TTS (not worth the API call)
// - Regular responses (80+ chars) = ElevenLabs (worth the quality upgrade)
// No API key? Everything falls back to browser TTS seamlessly.

/**
 * Should this text be spoken via ElevenLabs premium voice?
 * @param {string} text — text to speak
 * @param {object} context — { isMilestone, isRankUp, isBriefing, isVoiceCommand, isTheatrical }
 * @returns {boolean}
 */
export function shouldUseElevenLabs(text, context = {}) {
  // No API key → always browser
  const hasKey = !!(
    import.meta.env.VITE_ELEVENLABS_API_KEY ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem('jos-settings') || '{}').elevenLabsKey
      } catch { return null }
    })()
  )
  if (!hasKey) return false

  // Check settings — user may have disabled premium voice
  try {
    const settings = JSON.parse(localStorage.getItem('jos-settings') || '{}')
    if (settings.voice === false) return false // TTS disabled entirely
  } catch { /* proceed */ }

  // Cinematic moments → always ElevenLabs
  if (context.isMilestone) return true
  if (context.isRankUp) return true
  if (context.isBriefing) return true
  if (context.isTheatrical) return true

  // Voice commands → always browser (need instant response)
  if (context.isVoiceCommand) return false

  // Empty text check
  if (!text) return false

  // Default: ElevenLabs for ALL responses (streaming makes short text fast too)
  return true
}
