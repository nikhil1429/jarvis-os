// VizConceptRing.jsx — Small circular progress ring for a concept
export default function VizConceptRing({ name, strength = 0, size = 44, showLabel = true }) {
  const r = (size - 6) / 2, circ = 2 * Math.PI * r
  const color = strength >= 80 ? '#00f0ff' : strength >= 60 ? '#10b981' : strength >= 30 ? '#d4a853' : '#ef4444'
  return (
    <div style={{ display: 'inline-block', textAlign: 'center' }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#0d2137" strokeWidth={3} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ - circ * (strength / 100)}
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dashoffset 0.8s' }} />
        <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={10} fontFamily="Share Tech Mono, monospace">{strength}</text>
      </svg>
      {showLabel && <p style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#5a7a94', marginTop: 2, maxWidth: size + 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>}
    </div>
  )
}
