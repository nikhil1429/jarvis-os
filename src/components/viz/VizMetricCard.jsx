// VizMetricCard.jsx — Single metric display
export default function VizMetricCard({ label, value, delta, color = '#00b4d8' }) {
  return (
    <div className="glass-card" style={{ padding: 8, textAlign: 'center', minWidth: 70 }}>
      <p style={{ fontFamily: 'Share Tech Mono', fontSize: 18, color, fontWeight: 'bold' }}>{value}</p>
      {delta !== undefined && (
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#5a7a94' }}>
          {delta > 0 ? '+' : ''}{delta}
        </span>
      )}
      <p style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: '#5a7a94', marginTop: 2, letterSpacing: '0.08em' }}>{label}</p>
    </div>
  )
}
