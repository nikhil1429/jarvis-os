// CmdTab.jsx — Command Center (Tab 1) main layout
// WHY: CMD is the daily operations hub — the first thing Nikhil sees.
// Includes briefing, pulse, adaptive suggestions, tasks, battle plan, build log, second brain.

import { useState } from 'react'
import { X, Zap, ChevronDown, ChevronUp, Newspaper } from 'lucide-react'
import TaskList from './TaskList.jsx'
import BattlePlan from './BattlePlan.jsx'
import DailyBuildLog from './DailyBuildLog.jsx'
import Briefing from './Briefing.jsx'
import SecondBrain from './SecondBrain.jsx'
import TimeCapsule from '../reports/TimeCapsule.jsx'
import WeaknessNotification from '../viz/WeaknessNotification.jsx'
import TrendReport from '../reports/TrendReport.jsx'
import useAdaptiveUI from '../../hooks/useAdaptiveUI.js'
import useStorage from '../../hooks/useStorage.js'

function WeeklyNewsletter() {
  const { get } = useStorage()
  const [expanded, setExpanded] = useState(false)
  const weekly = get('weekly') || {}
  const newsletter = weekly.newsletter
  if (!newsletter?.text) return null
  return (
    <div className="glass-card p-3 border card-enter" style={{ borderColor: '#d4a853', borderTopWidth: 3, animationDelay: '40ms' }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Newspaper size={14} className="text-gold" />
          <span className="font-display text-xs font-bold text-gold tracking-wider gold-heading">WEEKLY NEWSLETTER</span>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-text-muted hover:text-text">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      <p className={`font-body text-xs text-text leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>{newsletter.text}</p>
      {newsletter.generatedAt && (
        <p className="font-mono text-[8px] text-text-muted mt-1">{new Date(newsletter.generatedAt).toLocaleDateString()}</p>
      )}
    </div>
  )
}

function RecentReports() {
  const { get } = useStorage()
  const weekly = get('weekly') || {}
  const weeklyObj = typeof weekly === 'object' && !Array.isArray(weekly) ? weekly : {}
  const trend = weeklyObj.lastTrendReport
  const review = weeklyObj.lastWeeklyReport
  // Show if generated in last 48 hours
  const isRecent = (ts) => ts && (Date.now() - new Date(ts).getTime()) < 48 * 3600000
  return (
    <>
      {trend && isRecent(trend.generatedAt) && <TrendReport report={trend} />}
      {review && isRecent(review.generatedAt) && <TrendReport report={review} />}
    </>
  )
}

export default function CmdTab({ completedTasks, onToggleTask, pulse, onDismissPulse, weakness, onWeaknessTap, onWeaknessDismiss }) {
  const { suggestions } = useAdaptiveUI()

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Weakness notification */}
      {weakness && <WeaknessNotification weakness={weakness} onTap={onWeaknessTap} onDismiss={onWeaknessDismiss} />}

      {/* Morning Briefing */}
      <div className="card-enter" style={{ animationDelay: '0ms' }}><Briefing /></div>
      <WeeklyNewsletter />
      <RecentReports />

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

      <div className="card-enter" style={{ animationDelay: '80ms' }}><TaskList completedTasks={completedTasks} onToggleTask={onToggleTask} /></div>
      <div className="card-enter" style={{ animationDelay: '160ms' }}><BattlePlan /></div>
      <div className="card-enter" style={{ animationDelay: '240ms' }}><DailyBuildLog /></div>
      <div className="card-enter" style={{ animationDelay: '320ms' }}><SecondBrain /></div>
      <div className="card-enter" style={{ animationDelay: '400ms' }}><TimeCapsule /></div>
    </div>
  )
}
