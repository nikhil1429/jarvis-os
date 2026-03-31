// MemoryPalace.jsx — Visual concept map with SVG connection lines
// WHY: Bible Section 10. Visual map shows concept relationships and strengths.
// Circle size = strength, color = mastery level, lines = prerequisites.

import { useMemo } from 'react'
import CONCEPTS from '../../data/concepts.js'
import useStorage from '../../hooks/useStorage.js'

function getNodeColor(strength) {
  if (strength >= 80) return '#d4a853' // gold
  if (strength >= 60) return '#22c55e' // green
  if (strength >= 30) return '#eab308' // yellow
  return '#ef4444' // red
}

const COLS = 6
const NODE_GAP_X = 110
const NODE_GAP_Y = 90
const PAD = 40

export default function MemoryPalace({ onSelectConcept }) {
  const { get } = useStorage()
  const saved = get('concepts') || []

  // Calculate node positions
  const nodes = useMemo(() => {
    return CONCEPTS.map((c, i) => {
      const s = saved.find(x => x.id === c.id)
      const strength = s?.strength || 0
      const col = i % COLS
      const row = Math.floor(i / COLS)
      return {
        ...c,
        strength,
        x: PAD + col * NODE_GAP_X + NODE_GAP_X / 2,
        y: PAD + row * NODE_GAP_Y + NODE_GAP_Y / 2,
        radius: 14 + (strength / 100) * 14, // 14-28px
      }
    })
  }, [saved])

  // Build connection lines from prerequisites
  const lines = useMemo(() => {
    const result = []
    nodes.forEach(node => {
      if (!node.prerequisites) return
      node.prerequisites.forEach(preId => {
        const pre = nodes.find(n => n.id === preId)
        if (pre) {
          const avgStrength = (node.strength + pre.strength) / 2
          result.push({
            x1: pre.x, y1: pre.y,
            x2: node.x, y2: node.y,
            opacity: 0.15 + (avgStrength / 100) * 0.5,
          })
        }
      })
    })
    return result
  }, [nodes])

  const totalRows = Math.ceil(CONCEPTS.length / COLS)
  const svgW = PAD * 2 + COLS * NODE_GAP_X
  const svgH = PAD * 2 + totalRows * NODE_GAP_Y

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <svg width={svgW} height={svgH} className="mx-auto" style={{ minWidth: svgW }}>
        {/* Connection lines — behind nodes */}
        <g style={{ pointerEvents: 'none' }}>
          {lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="#00b4d8" strokeWidth={1.5} opacity={l.opacity} />
          ))}
        </g>

        {/* Concept nodes */}
        {nodes.map(node => {
          const color = getNodeColor(node.strength)
          return (
            <g key={node.id} style={{ cursor: 'pointer' }}
              onClick={() => onSelectConcept?.(node.id)}>
              {/* Glow for strong concepts */}
              {node.strength >= 60 && (
                <circle cx={node.x} cy={node.y} r={node.radius + 4}
                  fill="none" stroke={color} opacity={0.2} strokeWidth={2} />
              )}
              {/* Main circle */}
              <circle cx={node.x} cy={node.y} r={node.radius}
                fill={color + '20'} stroke={color} strokeWidth={2} />
              {/* Strength % */}
              <text x={node.x} y={node.y - 2} textAnchor="middle" dominantBaseline="middle"
                fill={color} fontSize={9} fontFamily="Share Tech Mono, monospace" fontWeight="bold">
                {node.strength}%
              </text>
              {/* Name (abbreviated) */}
              <text x={node.x} y={node.y + node.radius + 12} textAnchor="middle"
                fill="#5a7a94" fontSize={8} fontFamily="Rajdhani, sans-serif">
                {node.name.length > 14 ? node.name.slice(0, 12) + '...' : node.name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
