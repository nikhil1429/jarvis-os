// VizComparisonChart.jsx — Side-by-side bar comparison (pure SVG)
export default function VizComparisonChart({ data = [] }) {
  if (data.length === 0) return null
  const max = Math.max(...data.map(d => Math.max(d.before || 0, d.after || 0)), 1)
  return (
    <div className="glass-card" style={{ padding: 10 }}>
      <p style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: '#5a7a94', letterSpacing: '0.1em', marginBottom: 6 }}>COMPARISON</p>
      {data.slice(0, 5).map((d, i) => {
        const diff = d.after - d.before
        const pct = d.before > 0 ? Math.round((diff / d.before) * 100) : 0
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#5a7a94', width: 50, flexShrink: 0 }}>{d.label}</span>
            <div style={{ flex: 1, display: 'flex', gap: 2, height: 10 }}>
              <div style={{ width: `${(d.before / max) * 100}%`, height: '100%', backgroundColor: '#5a7a94', borderRadius: 2 }} />
              <div style={{ width: `${(d.after / max) * 100}%`, height: '100%', backgroundColor: '#00b4d8', borderRadius: 2 }} />
            </div>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#5a7a94', width: 35, textAlign: 'right' }}>
              {pct > 0 ? '+' : ''}{pct}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
