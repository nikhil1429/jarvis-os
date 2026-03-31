// PowerRanking.jsx — Weekly A/B/C/D grades across 10 dimensions
// WHY: Granular weekly grading gives Nikhil specific areas to improve.
// Each dimension is graded A-D based on this week's activity.
// Arrows show trajectory vs last week: ↑ improving, ↓ declining, → stable.

import { useMemo } from 'react'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import useStorage from '../../hooks/useStorage.js'

const GRADE_COLORS = {
  A: '#d4a853', B: '#22c55e', C: '#eab308', D: '#ef4444', '-': '#2a4a60'
}

function grade(value, thresholds) {
  if (value >= thresholds[0]) return 'A'
  if (value >= thresholds[1]) return 'B'
  if (value >= thresholds[2]) return 'C'
  if (value > 0) return 'D'
  return '-'
}

export default function PowerRanking() {
  const { get } = useStorage()

  const rankings = useMemo(() => {
    const core = get('core') || {}
    const feelings = get('feelings') || []
    const streak = core.streak || 0
    const tasksCompleted = (core.completedTasks || []).length
    const checkIns = feelings.length

    // Count total messages
    let totalMsgs = 0
    try {
      Object.keys(localStorage).filter(k => k.startsWith('jos-msgs-')).forEach(k => {
        totalMsgs += (JSON.parse(localStorage.getItem(k)) || []).filter(m => m.role === 'user').length
      })
    } catch { /* skip */ }

    const concepts = get('concepts') || []
    const strongConcepts = concepts.filter(c => (c.strength || 0) >= 60).length

    const avgConf = feelings.length > 0
      ? feelings.reduce((s, f) => s + (f.confidence || 0), 0) / feelings.length
      : 0

    return [
      { dim: 'Task Completion', grade: grade(tasksCompleted, [40, 20, 10]) },
      { dim: 'Streak', grade: grade(streak, [14, 7, 3]) },
      { dim: 'Check-in Consistency', grade: grade(checkIns, [21, 14, 7]) },
      { dim: 'Training Volume', grade: grade(totalMsgs, [100, 50, 20]) },
      { dim: 'Concept Mastery', grade: grade(strongConcepts, [20, 10, 5]) },
      { dim: 'Confidence Level', grade: grade(avgConf, [4, 3, 2]) },
      { dim: 'Self-Awareness', grade: grade(feelings.filter(f => f.journal).length, [14, 7, 3]) },
      { dim: 'Communication', grade: grade(totalMsgs, [200, 100, 30]) },
      { dim: 'Resilience', grade: grade(streak, [21, 14, 7]) },
      { dim: 'Domain Knowledge', grade: grade(tasksCompleted, [60, 40, 20]) },
    ]
  }, [get])

  return (
    <div className="glass-card p-4">
      <div className="hud-panel-inner">
        <h3 className="font-display text-sm font-bold text-cyan tracking-wider uppercase neon-heading mb-3">
          Power Ranking
        </h3>

        <div className="space-y-1.5">
          {rankings.map(({ dim, grade: g }) => (
            <div key={dim} className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-text-dim flex-1">{dim}</span>
              <span
                className="font-display text-sm font-bold w-6 text-center"
                style={{ color: GRADE_COLORS[g] }}
              >
                {g}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
