// VoiceEnrollment.jsx — Voice calibration: learn user's voice features over 20 seconds
import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { extractFeatures, createVoicePrint, saveVoicePrint } from '../utils/voiceFingerprint.js'

const REQUIRED_SAMPLES = 40

export default function VoiceEnrollment({ analyserRef, onComplete, onSkip }) {
  const [samples, setSamples] = useState([])
  const [done, setDone] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!analyserRef?.current) return
    intervalRef.current = setInterval(() => {
      const features = extractFeatures(analyserRef.current)
      if (features.avgEnergy > 5) { // speaking, not silence
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
  }, [analyserRef, onComplete, done])

  const progress = Math.min(100, Math.round((samples.length / REQUIRED_SAMPLES) * 100))
  const r = 52, circ = 2 * Math.PI * r

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(2,10,19,0.98)' }}>
      {/* Corner brackets */}
      <div style={{ position: 'absolute', top: 8, left: 8, width: 20, height: 20, borderLeft: '2px solid rgba(0,240,255,0.15)', borderTop: '2px solid rgba(0,240,255,0.15)' }} />
      <div style={{ position: 'absolute', bottom: 8, right: 8, width: 20, height: 20, borderRight: '2px solid rgba(0,240,255,0.15)', borderBottom: '2px solid rgba(0,240,255,0.15)' }} />

      <p style={{ fontFamily: 'Share Tech Mono', fontSize: 12, letterSpacing: '0.2em', color: '#00b4d8', marginBottom: 8 }}>
        VOICE CALIBRATION
      </p>
      <p style={{ fontFamily: 'Exo 2', fontSize: 13, color: '#5a7a94', marginBottom: 24, maxWidth: 300, textAlign: 'center' }}>
        {done ? 'Voice print captured.' : 'Sir, speak naturally for 20 seconds so I can learn your voice.'}
      </p>

      {/* Progress ring */}
      <svg width={120} height={120}>
        <circle cx={60} cy={60} r={r} fill="none" stroke="#0d2137" strokeWidth={4} />
        <circle cx={60} cy={60} r={r} fill="none" stroke={done ? '#10b981' : '#00b4d8'} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ - circ * (progress / 100)}
          transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 0.3s' }} />
        <text x={60} y={58} textAnchor="middle" dominantBaseline="middle"
          fill={done ? '#10b981' : '#00b4d8'} fontSize={22} fontFamily="Share Tech Mono, monospace" fontWeight="bold">
          {done ? '✓' : `${progress}%`}
        </text>
        <text x={60} y={76} textAnchor="middle" fill="#5a7a94" fontSize={9} fontFamily="Share Tech Mono">
          {done ? `${samples.length} samples` : 'SPEAK NOW'}
        </text>
      </svg>

      <p style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#2a4a60', marginTop: 16 }}>
        {samples.length > 0 && !done ? `${samples.length} samples captured...` : done ? 'Calibration complete.' : 'Waiting for voice...'}
      </p>

      <button onClick={onSkip} style={{
        marginTop: 24, fontFamily: 'Share Tech Mono', fontSize: 10, color: '#5a7a94',
        background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em',
      }}>
        {done ? '' : 'SKIP FOR NOW'}
      </button>
    </div>
  )
}
