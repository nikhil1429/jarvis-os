// CmdTab.jsx — Command Center (Tab 1) main layout
// WHY: CMD is the daily operations hub — the first thing Nikhil sees.
// Includes briefing, pulse, adaptive suggestions, tasks, battle plan, build log, second brain.

import { X, Zap } from 'lucide-react'
import TaskList from './TaskList.jsx'
import BattlePlan from './BattlePlan.jsx'
import DailyBuildLog from './DailyBuildLog.jsx'
import Briefing from './Briefing.jsx'
import SecondBrain from './SecondBrain.jsx'
import useAdaptiveUI from '../../hooks/useAdaptiveUI.js'

export default function CmdTab({ completedTasks, onToggleTask, pulse, onDismissPulse }) {
  const { suggestions } = useAdaptiveUI()

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Morning Briefing */}
      <Briefing />

      {/* Adaptive Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <div key={i} className="glass-card px-3 py-2 border"
              style={{ borderColor: s.priority === 'high' ? '#d4a853' : '#00b4d8', borderLeftWidth: 3 }}>
              <div className="flex items-center gap-2">
                <Zap size={12} className={s.priority === 'high' ? 'text-gold' : 'text-cyan'} />
                <p className="font-body text-xs text-text leading-relaxed">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4-Hour Pulse Card */}
      {pulse && (
        <div className="glass-card overflow-hidden border-l-2 border-l-cyan animate-fade-in">
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
      <SecondBrain />
    </div>
  )
}
