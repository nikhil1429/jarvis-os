// VizDelta.jsx — Before/after comparison with arrow
export default function VizDelta({ label, before, after, unit = '' }) {
  const diff = after - before
  const pct = before > 0 ? Math.round((diff / before) * 100) : 0
  const color = diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#5a7a94'
  const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Share Tech Mono', fontSize: 11 }}>
      <span style={{ color: '#5a7a94', minWidth: 60 }}>{label}</span>
      <span style={{ color: '#d0e8f8' }}>{before}{unit}</span>
      <span style={{ color }}>→</span>
      <span style={{ color: '#d0e8f8' }}>{after}{unit}</span>
      <span style={{ color, fontSize: 10 }}>{arrow} {pct > 0 ? '+' : ''}{pct}%</span>
    </div>
  )
}
