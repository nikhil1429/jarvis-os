// VizDependencyTree.jsx — Interactive concept dependency tree (Canvas 2D)
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import CONCEPTS from '../../data/concepts.js'

const TAU = Math.PI * 2

export default function VizDependencyTree({ rootConcept, onQuizConcept, onClose }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width = canvas.parentElement.clientWidth
    const H = canvas.height = 350

    const saved = (() => { try { return JSON.parse(localStorage.getItem('jos-concepts') || '[]') } catch { return [] } })()
    const target = CONCEPTS.find(c => c.name.toLowerCase().includes(rootConcept.toLowerCase()))
    if (!target) return

    // Build tree: target + prerequisites (2 levels)
    const nodes = []
    const edges = []
    const getStrength = (id) => (saved.find(s => s.id === id) || {}).strength || 0
    const getColor = (str) => str >= 80 ? '#00f0ff' : str >= 60 ? '#10b981' : str >= 30 ? '#d4a853' : '#ef4444'

    // Level 0: target
    const tStr = getStrength(target.id)
    nodes.push({ id: target.id, name: target.name, strength: tStr, x: W / 2, y: 50, level: 0, color: getColor(tStr) })

    // Level 1: direct prerequisites
    const prereqs = (target.prerequisites || []).map(pid => CONCEPTS.find(c => c.id === pid)).filter(Boolean)
    prereqs.forEach((pre, i) => {
      const s = getStrength(pre.id)
      const x = (W / (prereqs.length + 1)) * (i + 1)
      nodes.push({ id: pre.id, name: pre.name, strength: s, x, y: 160, level: 1, color: getColor(s) })
      edges.push({ from: target.id, to: pre.id })

      // Level 2: prerequisites of prerequisites
      ;(pre.prerequisites || []).forEach(pid2 => {
        const pre2 = CONCEPTS.find(c => c.id === pid2)
        if (pre2 && !nodes.find(n => n.id === pre2.id)) {
          const s2 = getStrength(pre2.id)
          nodes.push({ id: pre2.id, name: pre2.name, strength: s2, x: x + (Math.random() - 0.5) * 60, y: 270, level: 2, color: getColor(s2) })
          edges.push({ from: pre.id, to: pre2.id })
        }
      })
    })

    // Find weakest (root cause)
    const weakest = nodes.reduce((a, b) => a.strength < b.strength ? a : b, nodes[0])

    let t = 0
    let animId
    const draw = () => {
      t += 0.016; ctx.clearRect(0, 0, W, H)

      // Edges (dashed, animated)
      edges.forEach(e => {
        const from = nodes.find(n => n.id === e.from)
        const to = nodes.find(n => n.id === e.to)
        if (!from || !to) return
        ctx.beginPath(); ctx.setLineDash([4, 4]); ctx.lineDashOffset = -t * 30
        ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y)
        ctx.strokeStyle = 'rgba(0,180,216,0.2)'; ctx.lineWidth = 1; ctx.stroke()
        ctx.setLineDash([])
      })

      // Nodes
      nodes.forEach(n => {
        const isRoot = n.id === weakest.id
        const r = isRoot ? 34 : 26 + (n.strength / 100) * 8

        // Glow for root cause
        if (isRoot) {
          ctx.beginPath(); ctx.arc(n.x, n.y, r + 6, 0, TAU)
          ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1
          ctx.shadowBlur = 8 + Math.sin(t * 4) * 4; ctx.shadowColor = '#ef4444'
          ctx.stroke(); ctx.shadowBlur = 0
        }

        // Circle
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r)
        grad.addColorStop(0, n.color + '40'); grad.addColorStop(1, n.color + '10')
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU)
        ctx.fillStyle = grad; ctx.fill()
        ctx.strokeStyle = n.color; ctx.lineWidth = 2; ctx.stroke()

        // Text
        ctx.fillStyle = '#d0e8f8'; ctx.font = '9px "Share Tech Mono"'; ctx.textAlign = 'center'
        const shortName = n.name.length > 14 ? n.name.slice(0, 12) + '..' : n.name
        ctx.fillText(shortName, n.x, n.y - 3)
        ctx.fillStyle = n.color; ctx.font = 'bold 11px "Share Tech Mono"'
        ctx.fillText(n.strength + '%', n.x, n.y + 10)

        if (isRoot) {
          ctx.fillStyle = '#ef4444'; ctx.font = '8px "Share Tech Mono"'
          ctx.fillText('ROOT CAUSE', n.x, n.y + r + 14)
        }
        ctx.textAlign = 'start'
      })

      animId = requestAnimationFrame(draw)
    }
    draw()

    // Click handler
    const onClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      for (const n of nodes) {
        if (Math.sqrt((mx - n.x) ** 2 + (my - n.y) ** 2) < 30) {
          onQuizConcept?.(n.id); return
        }
      }
    }
    canvas.addEventListener('click', onClick)

    return () => { cancelAnimationFrame(animId); canvas.removeEventListener('click', onClick) }
  }, [rootConcept, onQuizConcept])

  return (
    <div className="fixed inset-0 z-[800] flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(2,10,19,0.97)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg px-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-sm font-bold tracking-[0.15em] gold-heading" style={{ color: '#d4a853' }}>ROOT CAUSE ANALYSIS</h2>
          <button onClick={onClose} style={{ color: '#5a7a94' }}><X size={18} /></button>
        </div>
        <div className="glass-card overflow-hidden" style={{ borderTop: '2px solid #d4a853' }}>
          <canvas ref={canvasRef} style={{ width: '100%', cursor: 'pointer' }} />
        </div>
        <p style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#5a7a94', textAlign: 'center', marginTop: 8 }}>Click any concept to quiz on it</p>
      </div>
    </div>
  )
}
