// IntelligenceDash.jsx — 9 intelligence features with confidence rings
// WHY: Shows how much JARVIS knows about Nikhil across each feature.
// Confidence grows from PRIORS (40%) → LOCKED_IN (95%) as data accumulates.

import useIntelligence from '../../hooks/useIntelligence.js'

const FEATURES = [
  { key: 'energy', name: 'Energy Map', desc: 'Peak hours, crash patterns, caffeine effects' },
  { key: 'mood', name: 'Mood Oracle', desc: 'Emotional patterns, triggers, weekly trends' },
  { key: 'focus', name: 'Motivation Genome', desc: 'Primary/secondary motivation drivers' },
  { key: 'sleep', name: 'Body Correlations', desc: 'Sleep, caffeine, food → focus patterns' },
  { key: 'streak', name: 'Anti-Burnout', desc: 'Burnout indicators, avoidance detection' },
  { key: 'energy', name: 'Communication Style', desc: 'Crutch words, underselling patterns' },
  { key: 'streak', name: 'Estimation Accuracy', desc: 'Morning bet vs actual completion' },
  { key: 'mood', name: 'Forgetting Curve', desc: 'Concepts due for review scheduling' },
  { key: 'streak', name: 'Relationship Map', desc: 'Support network, mentioned people' },
]

function getConfidenceColor(confidence) {
  if (confidence >= 0.95) return '#d4a853' // gold
  if (confidence >= 0.85) return '#22c55e' // green
  if (confidence >= 0.70) return '#00b4d8' // cyan
  if (confidence >= 0.55) return '#f97316' // orange
  return '#eab308' // yellow
}

function ConfidenceRing({ confidence, size = 48 }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - circ * confidence
  const color = getConfidenceColor(confidence)

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#0d2137" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={3} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={10} fontFamily="Share Tech Mono, monospace">
        {Math.round(confidence * 100)}
      </text>
    </svg>
  )
}

export default function IntelligenceDash() {
  const { getFeatureIntelligence } = useIntelligence()

  return (
    <div className="mt-6">
      <h3 className="font-display text-sm font-bold text-cyan tracking-wider uppercase mb-3">
        Intelligence System
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {FEATURES.map((feat, i) => {
          const intel = getFeatureIntelligence(feat.key)
          const color = getConfidenceColor(intel.confidence)

          return (
            <div key={i} className="glass-card p-3 border border-border">
              <div className="flex items-start gap-3">
                <ConfidenceRing confidence={intel.confidence} />
                <div className="flex-1 min-w-0">
                  <p className="font-display text-xs font-bold text-text tracking-wide">{feat.name}</p>
                  <p className="font-mono text-[9px] tracking-wider mt-0.5" style={{ color }}>
                    {intel.level.replace('_', ' ')}
                  </p>
                  <p className="font-body text-[10px] text-text-dim mt-1 leading-relaxed">{feat.desc}</p>
                  <p className="font-mono text-[8px] mt-1" style={{ color: '#5a7a94' }}>
                    {intel.source === 'personal' ? `${intel.dataCount} data points` : 'research priors'}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
