// VizTrendChart.jsx — SVG line chart for progression over time
export default function VizTrendChart({ data = [], label = '', color = '#00b4d8' }) {
  if (data.length < 2) return null
  const W = 200, H = 50, PAD = 8
  const values = data.map(d => d.value || d)
  const min = Math.min(...values), max = Math.max(...values) || 1
  const range = max - min || 1
  const points = values.map((v, i) => ({
    x: PAD + (i / (values.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (v - min) / range) * (H - PAD * 2),
  }))
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const fillD = pathD + ` L${points[points.length-1].x},${H} L${points[0].x},${H} Z`
  return (
    <div className="glass-card" style={{ padding: 8 }}>
      {label && <p style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: '#5a7a94', marginBottom: 4, letterSpacing: '0.1em' }}>{label}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.15" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <path d={fillD} fill="url(#tg)" />
        <polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth="1.5" />
        {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 3.5 : 2} fill={color} opacity={i === points.length - 1 ? 1 : 0.6} />)}
      </svg>
    </div>
  )
}
