// DecisionEliminator.jsx — "Just Tell Me" single-card when energy ≤ 2
// WHY: Low energy = decision paralysis. ONE option. Not a list.

import { useState, useMemo } from 'react'
import TASKS from '../../data/tasks.js'
import CONCEPTS from '../../data/concepts.js'

function pickNextAction() {
  try {
    const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
    const completed = core.completedTasks || []
    const concepts = JSON.parse(localStorage.getItem('jos-concepts') || '[]')

    // Priority 1: Overdue concept review (easy, feels productive)
    const overdue = CONCEPTS.map(c => {
      const saved = concepts.find(x => x.id === c.id)
      if (!saved?.lastReviewed) return null
      const days = (Date.now() - new Date(saved.lastReviewed).getTime()) / 86400000
      return days > 7 && (saved.strength || 0) >= 30 ? { ...c, strength: saved.strength } : null
    }).filter(Boolean)
    if (overdue.length > 0) {
      const concept = overdue[0]
      return { text: `Review ${concept.name}`, detail: '10 min quiz — low effort', action: { type: 'mode', mode: 'quiz' } }
    }

    // Priority 2: Easiest pending task
    const pending = TASKS.filter(t => !completed.includes(t.id))
    if (pending.length > 0) {
      return { text: pending[0].name, detail: 'Next task on the list', action: { type: 'task', taskId: pending[0].id } }
    }

    // Priority 3: Just review
    return { text: 'Review what you learned this week', detail: 'Teach mode — explain to consolidate', action: { type: 'mode', mode: 'teach' } }
  } catch {
    return { text: 'Take a breath', detail: "It's okay to rest", action: null }
  }
}

export default function DecisionEliminator({ onAction }) {
  const [idx, setIdx] = useState(0)

  const actions = useMemo(() => {
    const list = []
    for (let i = 0; i < 5; i++) list.push(pickNextAction())
    // Deduplicate
    const seen = new Set()
    return list.filter(a => { if (seen.has(a.text)) return false; seen.add(a.text); return true })
  }, [])

  const current = actions[idx % actions.length]

  return (
    <div className="max-w-sm mx-auto mt-12">
      <div className="glass-card p-8 text-center" style={{ borderTop: '2px solid #00b4d8' }}>
        <p className="font-mono text-[10px] text-cyan tracking-widest mb-6">DO THIS NEXT</p>
        <p className="font-display text-lg font-bold text-text tracking-wide mb-2">{current.text}</p>
        <p className="font-body text-xs text-text-dim mb-8">{current.detail}</p>

        <button onClick={() => onAction?.(current.action)}
          className="w-full py-3 rounded border border-cyan/40 text-cyan font-display text-sm font-bold
            tracking-wider hover:bg-cyan/10 transition-all mb-3">
          START
        </button>

        <p className="font-body text-xs text-text-dim mb-3" style={{ opacity: 0.5 }}>or just breathe. ok too.</p>

        <button onClick={() => setIdx(i => i + 1)}
          className="font-mono text-[9px] text-text-muted hover:text-cyan transition-colors tracking-wider">
          something else
        </button>
      </div>
    </div>
  )
}
