// useSound.js — Tone.js sound effects for JARVIS OS
// WHY: Audio feedback makes the app feel alive. Each action has a distinct sound:
// check = rising chime (reward), click = soft blip (acknowledgment), tab = triangle wave
// (navigation), streak = arpeggio (celebration), send = quick ping, receive = double-note.
// All sounds are synthesized in real-time via Tone.js — no audio files needed.
// Sounds respect the jos-settings toggle so users can mute them.

import { useCallback, useRef } from 'react'
import * as Tone from 'tone'
import useStorage from './useStorage.js'

export default function useSound() {
  const { get } = useStorage()
  const synthRef = useRef(null)
  const noiseSynthRef = useRef(null)
  const thinkingRef = useRef(null)
  const ambientRef = useRef(null)
  const heartbeatRef = useRef(null)
  const initialized = useRef(false)

  // WHY lazy init: Tone.js requires a user gesture before audio works (Chrome policy).
  // We create the synth on first use, not on mount, so it works after the "ENTER JARVIS" click.
  const ensureSynth = useCallback(async () => {
    if (!initialized.current) {
      await Tone.start()
      initialized.current = true
    }
    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.05, release: 0.3 },
        volume: -18,
      }).toDestination()
    }
    return synthRef.current
  }, [])

  // WHY check for settings: respect the user's sound preference
  const canPlay = useCallback(() => {
    const settings = get('settings')
    return settings?.sound !== false
  }, [get])

  const play = useCallback(async (soundName) => {
    if (!canPlay()) return
    try {
      const synth = await ensureSynth()
      const now = Tone.now()

      switch (soundName) {
        case 'check':
          // Rising two-note chime — reward feeling
          synth.triggerAttackRelease('C5', '16n', now)
          synth.triggerAttackRelease('E5', '16n', now + 0.08)
          break

        case 'click':
          // Soft blip — subtle acknowledgment
          synth.triggerAttackRelease('G4', '32n', now)
          break

        case 'tab':
          // Triangle wave feel — navigation click
          synth.triggerAttackRelease('A4', '32n', now)
          break

        case 'streak':
          // Three-note arpeggio — celebration
          synth.triggerAttackRelease('C5', '16n', now)
          synth.triggerAttackRelease('E5', '16n', now + 0.1)
          synth.triggerAttackRelease('G5', '16n', now + 0.2)
          break

        case 'send':
          // Quick ping — message sent
          synth.triggerAttackRelease('E5', '32n', now)
          break

        case 'receive':
          // Double-note confirmation — JARVIS responded
          synth.triggerAttackRelease('G4', '32n', now)
          synth.triggerAttackRelease('B4', '32n', now + 0.1)
          break

        case 'capture':
          // Soft confirmation — quick capture saved
          synth.triggerAttackRelease('D5', '16n', now)
          synth.triggerAttackRelease('F5', '16n', now + 0.06)
          break

        case 'milestone':
          // Full chord + burst — major achievement
          synth.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '4n', now)
          break

        case 'boot':
          // Rising sweep 120→600Hz — system coming online
          synth.triggerAttackRelease('C3', '8n', now)
          synth.triggerAttackRelease('G3', '8n', now + 0.12)
          synth.triggerAttackRelease('C4', '8n', now + 0.24)
          synth.triggerAttackRelease('E4', '4n', now + 0.36)
          break

        case 'intelligence':
          // Rising three-note chime — feature levels up
          synth.triggerAttackRelease('E4', '16n', now)
          synth.triggerAttackRelease('G4', '16n', now + 0.1)
          synth.triggerAttackRelease('B4', '16n', now + 0.2)
          break

        case 'ready':
          // Very soft two-note — mic reactivated, JARVIS ready to listen
          synth.triggerAttackRelease('A4', '32n', now)
          synth.triggerAttackRelease('C5', '32n', now + 0.05)
          break

        // ========== ATMOSPHERE SOUNDS ==========
        // WHY: Comm sounds create a "radio channel" feel — you hear JARVIS
        // "open" the channel before speaking and "close" it after. Makes the
        // voice feel like it's coming through a real system, not just a webpage.

        case 'commOpen':
          // Brief noise burst before JARVIS speaks — comm channel opening
          // WHY 50ms at -25dB: barely perceptible, creates subliminal "click"
          if (!noiseSynthRef.current) {
            noiseSynthRef.current = new Tone.NoiseSynth({
              noise: { type: 'white' },
              envelope: { attack: 0.005, decay: 0.04, sustain: 0, release: 0.01 },
              volume: -25,
            }).toDestination()
          }
          noiseSynthRef.current.triggerAttackRelease('32n', now)
          break

        case 'commClose':
          // Mirror of commOpen — comm channel closing after speech
          if (!noiseSynthRef.current) {
            noiseSynthRef.current = new Tone.NoiseSynth({
              noise: { type: 'white' },
              envelope: { attack: 0.005, decay: 0.04, sustain: 0, release: 0.01 },
              volume: -25,
            }).toDestination()
          }
          noiseSynthRef.current.triggerAttackRelease('32n', now)
          break

        case 'readyChime':
          // Two soft sine notes E5+G5 — mic reactivated, ready for input
          // WHY E5+G5: bright, optimistic interval (minor 3rd) that says "your turn"
          synth.triggerAttackRelease('E5', '32n', now)
          synth.triggerAttackRelease('G5', '32n', now + 0.06)
          break

        default:
          synth.triggerAttackRelease('C5', '32n', now)
      }
    } catch (err) {
      // WHY silent catch: audio failures should never break the app
      console.warn('[useSound] Failed to play:', soundName, err)
    }
  }, [canPlay, ensureSynth])

  // WHY separate function: thinkingSound is a looping tick that plays every 500ms
  // during API wait. It needs a stop function, unlike one-shot sounds.
  const startThinking = useCallback(async () => {
    if (!canPlay()) return () => {}
    try {
      const synth = await ensureSynth()
      const interval = setInterval(() => {
        try {
          synth.triggerAttackRelease('F6', '64n', Tone.now())
        } catch { /* ok */ }
      }, 500)
      thinkingRef.current = interval
      const stop = () => {
        clearInterval(interval)
        thinkingRef.current = null
        window._thinkingStop = null
      }
      // Register globally so jarvisStop() can kill it
      window._thinkingStop = stop
      return stop
    } catch {
      return () => {}
    }
  }, [canPlay, ensureSynth])

  const stopThinking = useCallback(() => {
    if (thinkingRef.current) {
      clearInterval(thinkingRef.current)
      thinkingRef.current = null
    }
  }, [])

  // Ambient hum — barely perceptible 60Hz sine wave
  const startAmbient = useCallback(async () => {
    if (!canPlay() || ambientRef.current) return
    try {
      await Tone.start()
      const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 2, decay: 0, sustain: 1, release: 2 },
        volume: -35,
      }).toDestination()
      synth.triggerAttack('B1')
      ambientRef.current = synth
    } catch { /* ok */ }
  }, [canPlay])

  const stopAmbient = useCallback(() => {
    if (ambientRef.current) {
      try { ambientRef.current.triggerRelease() } catch { /* ok */ }
      const ref = ambientRef.current
      ambientRef.current = null
      setTimeout(() => { try { ref.dispose() } catch { /* ok */ } }, 2000)
    }
  }, [])

  const setAmbientEnergy = useCallback((energy) => {
    if (!ambientRef.current) return
    const vol = energy <= 2 ? -40 : energy <= 3 ? -35 : -30
    try { ambientRef.current.volume.rampTo(vol, 1) } catch { /* ok */ }
  }, [])

  // Heartbeat — optional double-pulse matching energy BPM
  const startHeartbeat = useCallback(async (energy = 3) => {
    if (!canPlay() || heartbeatRef.current) return
    try {
      await Tone.start()
      const synth = await ensureSynth()
      const bpm = energy <= 2 ? 50 : energy <= 3 ? 65 : 80
      const interval = 60000 / bpm
      heartbeatRef.current = setInterval(() => {
        try {
          synth.triggerAttackRelease('E2', '32n', Tone.now())
          setTimeout(() => {
            try { synth.triggerAttackRelease('C2', '64n', Tone.now()) } catch { /* ok */ }
          }, 200)
        } catch { /* ok */ }
      }, interval)
    } catch { /* ok */ }
  }, [canPlay, ensureSynth])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null }
  }, [])

  return { play, startThinking, stopThinking, startAmbient, stopAmbient, setAmbientEnergy, startHeartbeat, stopHeartbeat }
}
