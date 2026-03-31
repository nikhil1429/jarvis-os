// CmdTab.jsx — Command Center (Tab 1) main layout
// WHY: CMD is the daily operations hub — the first thing Nikhil sees.
// Phase 6: Now includes 4-hour pulse card (pure JS, no API). Small dismissible
// card with cyan left border that auto-replaces on next pulse cycle.

import { X } from 'lucide-react'
import TaskList from './TaskList.jsx'
import BattlePlan from './BattlePlan.jsx'
import DailyBuildLog from './DailyBuildLog.jsx'

export default function CmdTab({ completedTasks, onToggleTask, pulse, onDismissPulse }) {
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* 4-Hour Pulse Card */}
      {pulse && (
        <div className="hud-panel rounded-lg overflow-hidden border-l-2 border-l-cyan animate-fade-in">
          <div className="hud-panel-inner px-4 py-3 flex items-start justify-between gap-3">
            <div>
              <span className="font-mono text-[9px] text-cyan tracking-widest block mb-1">
                PULSE — {new Date(pulse.timestamp).toLocaleTimeString('en-IN', {
                  hour: '2-digit', minute: '2-digit'
                })}
              </span>
              <p className="font-body text-sm text-text leading-relaxed">
                {pulse.text}
              </p>
            </div>
            <button
              onClick={onDismissPulse}
              className="text-text-muted hover:text-cyan transition-colors flex-shrink-0 mt-0.5"
              aria-label="Dismiss pulse"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <TaskList completedTasks={completedTasks} onToggleTask={onToggleTask} />
      <BattlePlan />
      <DailyBuildLog />
    </div>
  )
}
