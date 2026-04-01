// useVoiceVerification.js — Full voice biometrics: identity + mood + vitals + multi-speaker
import { useRef, useCallback, useState } from 'react'
import { extractFeatures, verifyVoice, loadVoicePrint, isEnrolled, detectMood, checkVoiceVitals, identifySpeaker, getAuthLevel } from '../utils/voiceFingerprint.js'

export default function useVoiceVerification() {
  const [status, setStatus] = useState('idle')
  const [confidence, setConfidence] = useState(0)
  const [detectedMood, setDetectedMood] = useState({ mood: 'neutral', confidence: 0 })
  const [voiceVitals, setVoiceVitals] = useState({ status: 'normal', deviations: {} })
  const [speaker, setSpeaker] = useState(null)
  const [authLevel, setAuthLevel] = useState({ level: 1, label: 'GUEST', color: '#5a7a94' })

  const recent = useRef([])
  const intervalRef = useRef(null)
  const continuousRef = useRef(null)

  const checkVoice = useCallback((analyser) => {
    if (!isEnrolled()) { setStatus('not-enrolled'); return }
    const f = extractFeatures(analyser)
    if (f.avgEnergy < 5) return
    recent.current.push(f)
    if (recent.current.length > 15) recent.current.shift()
    if (recent.current.length < 5) { setStatus('checking'); return }

    // Average features
    const avg = {}
    ;['spectralCentroid', 'dominantBand', 'zeroCrossings', 'spectralFlatness'].forEach(k => {
      avg[k] = recent.current.reduce((s, x) => s + x[k], 0) / recent.current.length
    })

    // Identity verification
    const storedPrint = loadVoicePrint()
    const verResult = verifyVoice(avg, storedPrint)
    setConfidence(verResult.confidence)
    setStatus(verResult.match ? 'verified' : 'mismatch')

    // Speaker identification
    const spk = identifySpeaker(avg)
    setSpeaker(spk)

    // Auth level
    setAuthLevel(getAuthLevel(verResult, spk))

    // Mood detection (E1)
    setDetectedMood(detectMood(recent.current))

    // Voice vitals (E2)
    setVoiceVitals(checkVoiceVitals(recent.current, storedPrint))

    // Guest speaker event
    if (spk.name !== 'Sir' && spk.name !== 'unknown' && spk.confidence > 50) {
      window.dispatchEvent(new CustomEvent('jarvis-guest-speaker', { detail: { name: spk.name } }))
    }

    if (!verResult.match) console.log('VOICE MISMATCH:', verResult.confidence + '%', 'speaker:', spk.name)
  }, [])

  const startVerification = useCallback((analyser) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    recent.current = []
    intervalRef.current = setInterval(() => checkVoice(analyser), 500)
  }, [checkVoice])

  const stopVerification = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (continuousRef.current) { clearInterval(continuousRef.current); continuousRef.current = null }
    recent.current = []
  }, [])

  // E5: Continuous 30s re-verification
  const startContinuousVerification = useCallback((analyser) => {
    if (continuousRef.current) clearInterval(continuousRef.current)
    continuousRef.current = setInterval(() => {
      const f = extractFeatures(analyser)
      if (f.avgEnergy < 5) return
      const result = verifyVoice(f, loadVoicePrint())
      if (!result.match && result.confidence < 40) {
        console.log('CONTINUOUS VERIFY: drift detected, confidence:', result.confidence)
        setStatus('drift')
        window.dispatchEvent(new CustomEvent('jarvis-speaker-drift'))
      }
    }, 30000)
  }, [])

  return { status, confidence, detectedMood, voiceVitals, speaker, authLevel, startVerification, stopVerification, startContinuousVerification }
}
