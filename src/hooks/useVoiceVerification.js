// useVoiceVerification.js — Continuous speaker identity verification
import { useRef, useCallback, useState } from 'react'
import { extractFeatures, verifyVoice, loadVoicePrint, isEnrolled } from '../utils/voiceFingerprint.js'

export default function useVoiceVerification() {
  const [status, setStatus] = useState('idle') // idle|verified|mismatch|checking|not-enrolled
  const [confidence, setConfidence] = useState(0)
  const recent = useRef([])
  const intervalRef = useRef(null)

  const checkVoice = useCallback((analyser) => {
    if (!isEnrolled()) { setStatus('not-enrolled'); return }
    const f = extractFeatures(analyser)
    if (f.avgEnergy < 5) return
    recent.current.push(f)
    if (recent.current.length > 10) recent.current.shift()
    if (recent.current.length < 5) { setStatus('checking'); return }

    const avg = {}
    ;['spectralCentroid', 'dominantBand', 'zeroCrossings', 'spectralFlatness'].forEach(k => {
      avg[k] = recent.current.reduce((s, x) => s + x[k], 0) / recent.current.length
    })
    const result = verifyVoice(avg, loadVoicePrint())
    setConfidence(result.confidence)
    setStatus(result.match ? 'verified' : 'mismatch')
    if (!result.match) console.log('VOICE MISMATCH:', result.confidence + '%')
  }, [])

  const startVerification = useCallback((analyser) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    recent.current = []
    intervalRef.current = setInterval(() => checkVoice(analyser), 500)
  }, [checkVoice])

  const stopVerification = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    recent.current = []
  }, [])

  return { status, confidence, startVerification, stopVerification }
}
