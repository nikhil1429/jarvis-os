// ambientSound.js — Layer 10: Ambient context sounds using Tone.js
// WHY: Opus-tier responses deserve a different atmosphere. When JARVIS upgrades
// to Opus for deep analysis, a low-frequency hum creates a "supercomputer thinking"
// feeling — felt more than heard. Disposed cleanly after response completes.

import * as Tone from 'tone'

let activeAmbient = null

/**
 * Start an ambient sound context.
 * @param {'opus'} type - Which ambient to play
 */
export async function startAmbient(type) {
  stopAmbient() // Kill any existing

  try {
    await Tone.start()
  } catch { /* ok */ }

  if (type === 'opus') {
    try {
      // Low frequency hum — supercomputer thinking
      const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 2, decay: 0, sustain: 1, release: 2 }
      }).toDestination()
      synth.volume.value = -38

      // Subtle volume oscillation — breathing quality
      const lfo = new Tone.LFO('0.1hz', -40, -36).start()
      lfo.connect(synth.volume)

      synth.triggerAttack('D1') // Very deep, felt more than heard

      activeAmbient = { synth, lfo }
      console.log('[AMBIENT] Opus thinking hum started')
    } catch (err) {
      console.warn('[AMBIENT] Failed to start:', err)
    }
  }
}

/**
 * Stop any active ambient sound. Fades out over 2s.
 */
export function stopAmbient() {
  if (!activeAmbient) return

  const { synth, lfo } = activeAmbient
  activeAmbient = null

  try {
    if (synth) {
      synth.triggerRelease()
      setTimeout(() => {
        try { synth.dispose() } catch { /* ok */ }
        try { if (lfo) lfo.dispose() } catch { /* ok */ }
      }, 2500)
    }
  } catch { /* ok */ }
  console.log('[AMBIENT] Stopped')
}

/**
 * Check if ambient is currently playing.
 */
export function isAmbientActive() {
  return activeAmbient !== null
}
