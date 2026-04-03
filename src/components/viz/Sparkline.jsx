// Sparkline.jsx — 7-day inline trend chart used next to metrics
export default function Sparkline({ data = [], color = '#00b4d8', width = 60, height = 20 }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  const lastX = width
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - 4) - 2

  return (
    <svg width={width} height={height} style={{ flexShrink: 0, opacity: 0.7 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={2} fill={color} />
    </svg>
  )
}
