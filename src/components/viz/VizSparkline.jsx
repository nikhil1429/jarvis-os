// VizSparkline.jsx — Mini bar chart for last N scores
export default function VizSparkline({ scores = [], width = 80, height = 20 }) {
  if (scores.length === 0) return null
  const barW = Math.max(3, (width - scores.length) / scores.length)
  return (
    <svg width={width} height={height} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      {scores.map((s, i) => {
        const h = (s / 10) * height
        const color = s >= 7 ? '#10b981' : s >= 5 ? '#d4a853' : '#ef4444'
        const isLast = i === scores.length - 1
        return <rect key={i} x={i * (barW + 1)} y={height - h} width={barW} height={h}
          fill={color} opacity={isLast ? 1 : 0.6} rx={1} />
      })}
    </svg>
  )
}
