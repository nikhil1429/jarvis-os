// VoiceEnrollment.jsx — Voice calibration with OWN mic stream (not dependent on VoiceMode)
import { useState, useEffect, useRef } from 'react'
import { extractFeatures, createVoicePrint, saveVoicePrint } from '../utils/voiceFingerprint.js'

const REQUIRED_SAMPLES = 40

export default function VoiceEnrollment({ onComplete, onSkip }) {
  const [samples, setSamples] = useState([])
  const [done, setDone] = useState(false)
  const [micReady, setMicReady] = useState(false)
  const intervalRef = useRef(null)
  const analyserRef = useRef(null)
  const streamRef = useRef(null)
  const ctxRef = useRef(null)

  // Own mic setup
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      streamRef.current = stream
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        ctxRef.current = ctx
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        analyserRef.current = analyser
        setMicReady(true)
        console.log('ENROLLMENT: mic ready')
      } catch (err) { console.error('ENROLLMENT: audio setup failed', err) }
    }).catch(err => console.error('ENROLLMENT: getUserMedia failed', err))

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (ctxRef.current) try { ctxRef.current.close() } catch { /* ok */ }
    }
  }, [])

  // Sample collection once mic ready
  useEffect(() => {
    if (!micReady || !analyserRef.current) return
    intervalRef.current = setInterval(() => {
      const features = extractFeatures(analyserRef.current)
      if (features.avgEnergy > 5) {
        setSamples(prev => {
          const next = [...prev, features]
          if (next.length >= REQUIRED_SAMPLES && !done) {
            const print = createVoicePrint(next)
            if (print) { saveVoicePrint(print); setDone(true); setTimeout(() => onComplete(), 1500) }
          }
          return next
        })
      }
    }, 200)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [micReady, onComplete, done])

  const progress = Math.min(100, Math.round((samples.length / REQUIRED_SAMPLES) * 100))
  const r = 52, circ = 2 * Math.PI * r

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(2,10,19,0.98)' }}>
      <div style={{ position: 'absolute', top: 8, left: 8, width: 20, height: 20, borderLeft: '2px solid rgba(0,240,255,0.15)', borderTop: '2px solid rgba(0,240,255,0.15)' }} />
      <div style={{ position: 'absolute', bottom: 8, right: 8, width: 20, height: 20, borderRight: '2px solid rgba(0,240,255,0.15)', borderBottom: '2px solid rgba(0,240,255,0.15)' }} />

      <p style={{ fontFamily: 'Share Tech Mono', fontSize: 12, letterSpacing: '0.2em', color: '#00b4d8', marginBottom: 8 }}>VOICE CALIBRATION</p>
      <p style={{ fontFamily: 'Exo 2', fontSize: 13, color: '#5a7a94', marginBottom: 24, maxWidth: 300, textAlign: 'center' }}>
        {done ? 'Voice print captured.' : !micReady ? 'Requesting microphone...' : 'Sir, speak naturally for 20 seconds so I can learn your voice.'}
      </p>

      <svg width={120} height={120}>
        <circle cx={60} cy={60} r={r} fill="none" stroke="#0d2137" strokeWidth={4} />
        <circle cx={60} cy={60} r={r} fill="none" stroke={done ? '#10b981' : '#00b4d8'} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ - circ * (progress / 100)}
          transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 0.3s' }} />
        <text x={60} y={58} textAnchor="middle" dominantBaseline="middle"
          fill={done ? '#10b981' : '#00b4d8'} fontSize={22} fontFamily="Share Tech Mono, monospace" fontWeight="bold">
          {done ? '\u2713' : `${progress}%`}
        </text>
        <text x={60} y={76} textAnchor="middle" fill="#5a7a94" fontSize={9} fontFamily="Share Tech Mono">
          {done ? `${samples.length} samples` : micReady ? 'SPEAK NOW' : 'WAITING...'}
        </text>
      </svg>

      <p style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#2a4a60', marginTop: 16 }}>
        {samples.length > 0 && !done ? `${samples.length} samples captured...` : done ? 'Calibration complete.' : ''}
      </p>

      {!done && (
        <button onClick={onSkip} style={{ marginTop: 24, fontFamily: 'Share Tech Mono', fontSize: 10, color: '#5a7a94', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em' }}>
          SKIP FOR NOW
        </button>
      )}
    </div>
  )
}
