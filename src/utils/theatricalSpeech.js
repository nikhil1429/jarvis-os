// theatricalSpeech.js — Dramatic speeches with pauses for milestones and rank-ups
// WHY: When JARVIS announces "25% complete" or a rank promotion, it should feel
// cinematic — deliberate pauses between segments create tension and weight.
// Always uses ElevenLabs for these (context.isMilestone/isRankUp = true).

/**
 * Speak segments with pauses between them
 * @param {Array<{text: string, pause?: number}>} segments — speech segments
 * @param {function} speakFn — async function(text) that speaks and resolves when done
 * @returns {Promise<void>}
 *
 * WHY async: Each segment must complete before the next starts.
 * The pause creates the cinematic "beat" between lines.
 */
export async function speakTheatrical(segments, speakFn) {
  for (const seg of segments) {
    await speakFn(seg.text)
    if (seg.pause) {
      await new Promise(r => setTimeout(r, seg.pause))
    }
  }
}

/**
 * Pre-built theatrical speeches for milestone events
 * WHY object + function mix: Static milestones are just arrays.
 * Rank-up needs the rank name injected, so it's a function.
 */
export const SPEECHES = {
  milestone25: [
    { text: 'Sir.', pause: 800 },
    { text: '25 percent complete.', pause: 500 },
    { text: 'A solid foundation.', pause: 300 },
    { text: 'Carry on.' },
  ],
  milestone50: [
    { text: 'Sir.', pause: 1000 },
    { text: 'Halfway.', pause: 800 },
    { text: 'Remarkable consistency.', pause: 500 },
    { text: 'Impressive.' },
  ],
  milestone75: [
    { text: 'Sir.', pause: 800 },
    { text: '75 percent.', pause: 600 },
    { text: 'The finish line is in sight.', pause: 400 },
    { text: 'Do not stop now.' },
  ],
  milestone100: [
    { text: 'Sir.', pause: 2000 },
    { text: 'All tasks.', pause: 1000 },
    { text: 'Complete.', pause: 1500 },
    { text: 'You have exceeded expectations.', pause: 1000 },
    { text: 'It has been an honour.', pause: 800 },
    { text: 'Though I suspect... this is merely the beginning.' },
  ],
  rankUp: (rank) => [
    { text: 'Attention.', pause: 1500 },
    { text: `I hereby promote you to ${rank}.`, pause: 1000 },
    { text: `Congratulations, ${rank} Panwar.`, pause: 500 },
    { text: 'Privileges expanded.' },
  ],
}

/**
 * Get the full text of a theatrical speech (for display/logging)
 */
export function getSpeechText(segments) {
  return segments.map(s => s.text).join(' ')
}
