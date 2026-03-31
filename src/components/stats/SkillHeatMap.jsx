// SkillHeatMap.jsx — 35 concepts as color-coded grid cells
// WHY: Visual heat map of knowledge — red gaps scream for attention, gold cells
// show mastery. Each cell shows concept name + percentage. At a glance, Nikhil
// can see where his knowledge is strong and where the holes are.
// Red <30%, Yellow 30-60%, Green 60-80%, Gold 80%+

import CONCEPTS from '../../data/concepts.js'
import useStorage from '../../hooks/useStorage.js'

function getCellColor(strength) {
  if (strength < 30) return { bg: '#ef444420', border: '#ef444440', text: '#ef4444' }
  if (strength < 60) return { bg: '#eab30820', border: '#eab30840', text: '#eab308' }
  if (strength < 80) return { bg: '#22c55e20', border: '#22c55e40', text: '#22c55e' }
  return { bg: '#d4a85320', border: '#d4a85350', text: '#d4a853' }
}

export default function SkillHeatMap() {
  const { get } = useStorage()
  const savedConcepts = get('concepts') || []

  const getStrength = (conceptId) => {
    const saved = savedConcepts.find(c => c.id === conceptId)
    return saved?.strength || 0
  }

  return (
    <div className="glass-card p-4">
      <div className="hud-panel-inner">
        <h3 className="font-display text-sm font-bold text-cyan tracking-wider uppercase mb-3">
          Skill Heat Map
        </h3>

        <div className="grid grid-cols-5 gap-1.5">
          {CONCEPTS.map(concept => {
            const strength = getStrength(concept.id)
            const colors = getCellColor(strength)
            return (
              <div
                key={concept.id}
                className="rounded p-1.5 text-center transition-all duration-200 border"
                style={{
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                }}
                title={`${concept.name}: ${strength}%`}
              >
                <div className="font-mono text-[8px] text-text-dim truncate leading-tight">
                  {concept.name.length > 12 ? concept.name.slice(0, 11) + '...' : concept.name}
                </div>
                <div
                  className="font-display text-xs font-bold mt-0.5"
                  style={{ color: colors.text }}
                >
                  {strength}%
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3">
          {[
            { label: '<30%', color: '#ef4444' },
            { label: '30-60%', color: '#eab308' },
            { label: '60-80%', color: '#22c55e' },
            { label: '80%+', color: '#d4a853' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: l.color }} />
              <span className="font-mono text-[8px] text-text-muted">{l.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
