// VizEnergyBar.jsx — 7-day energy pattern
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export default function VizEnergyBar({ data = [] }) {
  const bars = data.length >= 7 ? data.slice(-7) : [...Array(7 - data.length).fill(0), ...data]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 40, width: '100%' }}>
      {bars.map((v, i) => {
        const h = Math.max(4, (v / 5) * 36)
        const color = v >= 4 ? '#10b981' : v === 3 ? '#d4a853' : v >= 1 ? '#ef4444' : '#0d2137'
        return (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: 36, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <div style={{ width: '100%', height: h, backgroundColor: color, borderRadius: 2, opacity: 0.8, transition: 'height 0.5s' }} />
            </div>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: 7, color: '#5a7a94' }}>{DAYS[i]}</span>
          </div>
        )
      })}
    </div>
  )
}
