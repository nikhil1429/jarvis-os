// TaskList.jsx — 82 tasks with week selector pills, checkboxes, progress bar
// WHY: This is the core productivity driver. Tasks are grouped by week (W1-W6),
// each with a checkbox that persists to localStorage. The progress bar uses a
// cyan-to-gold gradient — cyan for progress, gold when complete. Corner brackets
// on the panel give it the HUD feel. Completion state is stored per-task in
// jos-core.completedTasks (array of task IDs).

import { useState, useMemo } from 'react'
import { CheckSquare, Square } from 'lucide-react'
import TASKS from '../../data/tasks.js'

const WEEKS = [1, 2, 3, 4, 5, 6]

export default function TaskList({ completedTasks, onToggleTask }) {
  const [selectedWeek, setSelectedWeek] = useState(1)

  // Filter tasks for selected week
  const weekTasks = useMemo(
    () => TASKS.filter(t => t.week === selectedWeek),
    [selectedWeek]
  )

  // Calculate progress
  const totalDone = completedTasks.length
  const totalTasks = TASKS.length
  const progressPercent = Math.round((totalDone / totalTasks) * 100)

  // Per-week completion counts for pill badges
  const weekCounts = useMemo(() => {
    const counts = {}
    WEEKS.forEach(w => {
      const weekTaskIds = TASKS.filter(t => t.week === w).map(t => t.id)
      const done = weekTaskIds.filter(id => completedTasks.includes(id)).length
      counts[w] = { done, total: weekTaskIds.length }
    })
    return counts
  }, [completedTasks])

  return (
    <div className="glass-card p-4">
      <div className="hud-panel-inner">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-cyan tracking-wider uppercase neon-heading">
            Mission Tasks
          </h3>
          <span className="font-mono text-xs text-text-dim">
            {totalDone}/{totalTasks}
          </span>
        </div>

        {/* Progress bar — cyan-gold gradient */}
        <div className="w-full h-2 bg-border rounded-full mb-4 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 progress-glow-dot"
            style={{
              width: `${progressPercent}%`,
              background: progressPercent >= 100
                ? 'linear-gradient(90deg, #d4a853, #f0c060)'
                : 'linear-gradient(90deg, #00b4d8, #00f0ff, #d4a853)',
              boxShadow: progressPercent >= 100
                ? '0 0 10px rgba(212, 168, 83, 0.5)'
                : '0 0 8px rgba(0, 180, 216, 0.4)',
            }}
          />
        </div>

        {/* Week selector pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {WEEKS.map(w => {
            const isActive = selectedWeek === w
            const { done, total } = weekCounts[w]
            const isComplete = done === total
            return (
              <button
                key={w}
                onClick={() => setSelectedWeek(w)}
                className={`
                  flex-shrink-0 px-3 py-1.5 rounded font-mono text-xs tracking-wider
                  transition-all duration-200 border
                  ${isActive
                    ? 'bg-cyan/10 border-cyan text-cyan shadow-cyan-glow'
                    : isComplete
                      ? 'bg-gold/10 border-gold/40 text-gold'
                      : 'bg-card border-border text-text-dim hover:border-cyan/40 hover:text-text'
                  }
                `}
              >
                W{w}
                <span className="ml-1.5 text-[10px] opacity-70">
                  {done}/{total}
                </span>
              </button>
            )
          })}
        </div>

        {/* Task list */}
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
          {weekTasks.map(task => {
            const isDone = completedTasks.includes(task.id)
            return (
              <button
                key={task.id}
                onClick={() => onToggleTask(task.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded transition-all duration-200
                  text-left group
                  ${isDone
                    ? 'bg-cyan/5 hover:bg-cyan/10'
                    : 'hover:bg-card/80'
                  }
                `}
              >
                {isDone
                  ? <CheckSquare size={18} className="text-cyan flex-shrink-0" />
                  : <Square size={18} className="text-text-muted group-hover:text-text-dim flex-shrink-0" />
                }
                <span className={`font-body text-sm ${isDone ? 'text-text-dim line-through' : 'text-text'}`}>
                  {task.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
