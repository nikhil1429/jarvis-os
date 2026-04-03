// Delta.jsx — Change indicator ↑3 or ↓2
export default function Delta({ current, previous, suffix = '' }) {
  if (previous === undefined || previous === null) return null
  const diff = current - previous
  if (diff === 0) return <span className="font-mono text-[9px] text-text-muted">—</span>
  const color = diff > 0 ? '#10b981' : '#ef4444'
  const arrow = diff > 0 ? '↑' : '↓'
  return <span className="font-mono text-[9px]" style={{ color }}>{arrow}{Math.abs(diff).toFixed(suffix === '%' ? 0 : 1)}{suffix}</span>
}
