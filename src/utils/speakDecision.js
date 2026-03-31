// speakDecision.js — Decides when JARVIS should speak vs text-only
// WHY: Voice in = voice out, typed = text only. Prevents JARVIS from
// talking when you're reading, or going silent when you're speaking.
// Also respects "stop" for 60 seconds and detects rapid typing.

/**
 * @param {object} context
 * @param {boolean} context.isMilestone
 * @param {boolean} context.isBriefing
 * @param {boolean} context.isVoiceCheckIn
 * @param {boolean} context.isRankUp
 * @param {boolean} context.voiceOutputEnabled — jos-settings.voice
 * @param {boolean} context.userSaidStop — user said "stop" recently
 * @param {number}  context.timeSinceStop — ms since user said stop
 * @param {number}  context.responseLength — chars in JARVIS response
 * @param {boolean} context.rapidMessages — 3+ messages in 30s
 * @param {boolean} context.lastInputWasVoice
 * @param {boolean} context.lastInputWasTyped
 * @param {boolean} context.isVoiceCommand
 * @returns {{ speak: boolean, reason: string }}
 */
export function shouldJarvisSpeak(context) {
  // Always speak for cinematic moments
  if (context.isMilestone) return { speak: true, reason: 'milestone' }
  if (context.isBriefing) return { speak: true, reason: 'briefing' }
  if (context.isVoiceCheckIn) return { speak: true, reason: 'voice-checkin' }
  if (context.isRankUp) return { speak: true, reason: 'rank-up' }

  // Never speak if voice output is off
  if (!context.voiceOutputEnabled) return { speak: false, reason: 'voice-off' }

  // Respect user saying "stop" — stay silent for 60 seconds
  if (context.userSaidStop && context.timeSinceStop < 60000) {
    return { speak: false, reason: 'user-said-stop' }
  }

  // Very short responses aren't worth speaking
  if (context.responseLength < 20) return { speak: false, reason: 'too-short' }

  // Rapid typing = user is reading, not listening
  if (context.rapidMessages) return { speak: false, reason: 'rapid-typing' }

  // Voice command responses — always speak (user is in voice mode)
  if (context.isVoiceCommand) return { speak: true, reason: 'voice-command' }

  // CORE RULE: voice in = voice out
  if (context.lastInputWasVoice) return { speak: true, reason: 'voice-input' }

  // Typed input = text only
  if (context.lastInputWasTyped) return { speak: false, reason: 'typed-input' }

  // Default: silent
  return { speak: false, reason: 'default-silent' }
}
