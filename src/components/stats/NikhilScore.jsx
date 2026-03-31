// NikhilScore.jsx — 6-dimension personal score (/100)
// WHY: The Nikhil Score is a holistic measure across 6 dimensions.
// Unlike Interview Readiness (which is career-focused), this measures the
// full person: technical depth, consistency, self-awareness, communication,
// resilience, and domain knowledge. Gold border because this is the "identity" metric.

import useStorage from '../../hooks/useStorage.js'
import TASKS from '../../data/tasks.js'

const DIMENSIONS = [
  { key: 'techDepth',     label: 'Tech Depth',      max: 16 },
  { key: 'consistency',   label: 'Consistency',      max: 16 },
  { key: 'selfAwareness', label: 'Self-Awareness',   max: 16 },
  { key: 'communication', label: 'Communication',    max: 16 },
  { key: 'resilience',    label: 'Resilience',       max: 16 },
  { key: 'domain',        label: 'Domain',           max: 20 },
]

function getBarColor(pct) {
  if (pct < 30) return '#ef4444'
  if (pct < 60) return '#eab308'
  if (pct < 80) return '#22c55e'
  return '#d4a853'
}

export default function NikhilScore() {
  const { get } = useStorage()

  const core = get('core') || {}
  const feelings = get('feelings') || []
  const concepts = get('concepts') || []
  const allMsgCount = Object.keys(localStorage || {})
    .filter(k => k.startsWith('jos-msgs-'))
    .reduce((total, k) => {
      try { return total + (JSON.parse(localStorage.getItem(k)) || []).filter(m => m.role === 'user').length }
      catch { return total }
    }, 0)

  // TechDepth/16: based on concept strengths
  const avgStrength = concepts.length > 0
    ? concepts.reduce((s, c) => s + (c.strength || 0), 0) / 35
    : 0
  const techDepth = Math.min(16, Math.round((avgStrength / 100) * 16))

  // Consistency/16: streak + check-in count
  const streak = core.streak || 0
  const checkIns = feelings.length
  const consistency = Math.min(16, Math.round(((streak / 14) * 8) + ((Math.min(checkIns, 21) / 21) * 8)))

  // SelfAwareness/16: check-in count + journal entries
  const journalCount = feelings.filter(f => f.journal && f.journal.length > 10).length
  const selfAwareness = Math.min(16, Math.round(((Math.min(checkIns, 14) / 14) * 10) + ((Math.min(journalCount, 7) / 7) * 6)))

  // Communication/16: total messages sent
  const communication = Math.min(16, Math.round((Math.min(allMsgCount, 200) / 200) * 16))

  // Resilience/16: streak recovery + consistency despite low energy days
  const lowEnergyDays = feelings.filter(f => f.confidence && f.confidence <= 2).length
  const recoveries = Math.min(5, lowEnergyDays)
  const resilience = Math.min(16, Math.round(((streak / 14) * 8) + (recoveries * 1.6)))

  // Domain/20: tasks completed
  const tasksCompleted = (core.completedTasks || []).length
  const domain = Math.min(20, Math.round((tasksCompleted / TASKS.length) * 20))

  const scores = { techDepth, consistency, selfAwareness, communication, resilience, domain }
  const total = Object.values(scores).reduce((s, v) => s + v, 0)

  return (
    <div className="glass-card p-4" style={{ borderColor: '#d4a85330' }}>
      <div className="hud-panel-inner">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold text-gold tracking-wider uppercase gold-heading">
            Nikhil Score
          </h3>
          <span className="font-display text-2xl font-bold text-gold">{total}<span className="text-sm text-text-muted">/100</span></span>
        </div>

        <div className="space-y-2">
          {DIMENSIONS.map(dim => {
            const score = scores[dim.key]
            const pct = (score / dim.max) * 100
            return (
              <div key={dim.key} className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-text-dim w-24 tracking-wider">{dim.label}</span>
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: getBarColor(pct) }}
                  />
                </div>
                <span className="font-mono text-[9px] text-text-dim w-10 text-right">
                  {score}/{dim.max}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
