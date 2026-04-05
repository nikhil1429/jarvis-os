// CmdTab.jsx — Command Center (Tab 1) main layout
// WHY: CMD is the daily operations hub — the first thing Nikhil sees.
// Includes briefing, pulse, adaptive suggestions, tasks, battle plan, build log, second brain.

import { useState, useMemo, useEffect } from 'react'
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
import { generateObservations, detectCrisis } from '../../utils/jarvisObservations.js'
import { generateBootReflection } from '../../utils/jarvisInnerLife.js'
import { checkRelationshipMilestone } from '../../utils/relationshipEngine.js'
import { generateGhostCards } from '../../utils/ghostCardEngine.js'
import { generateInvestigations } from '../../utils/jarvisAgenda.js'
import GhostCard from '../viz/GhostCard.jsx'
import ContextRecoveryCard from './ContextRecoveryCard.jsx'
import DecisionEliminator from './DecisionEliminator.jsx'
import InitiationCard from './InitiationCard.jsx'
import WorkingThread from './WorkingThread.jsx'
import ProactiveSuggestion from './ProactiveSuggestion.jsx'

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
  const [showContextRecovery, setShowContextRecovery] = useState(true)
  const [showInitiation, setShowInitiation] = useState(false)
  const [dismissedObs, setDismissedObs] = useState(new Set())
  const [dismissedMilestone, setDismissedMilestone] = useState(false)
  const [ghostCards, setGhostCards] = useState(() => generateGhostCards({ tab: 'cmd' }))
  const [memoVisible, setMemoVisible] = useState(() => !!localStorage.getItem('jos-overnight-memo'))
  const overnightMemo = useMemo(() => { try { return JSON.parse(localStorage.getItem('jos-overnight-memo') || 'null') } catch { return null } }, [])
  const investigations = useMemo(() => generateInvestigations(), [])
  const observations = useMemo(() => generateObservations(), [])
  const topObservation = observations.find(o => !dismissedObs.has(o.type))
  const crisis = useMemo(() => detectCrisis(), [])
  const reflection = useMemo(() => generateBootReflection(), [])
  const milestone = useMemo(() => checkRelationshipMilestone(), [])
  let isShowMode = false
  try { isShowMode = JSON.parse(localStorage.getItem('jos-settings') || '{}').showMode || false } catch { /* ok */ }
  const energy = (() => { try { return JSON.parse(localStorage.getItem('jos-core') || '{}').energy || 3 } catch { return 3 } })()

  // Stalling detection — 3+ min on CMD with no activity
  useEffect(() => {
    const timer = setTimeout(() => setShowInitiation(true), 3 * 60 * 1000)
    const reset = () => { clearTimeout(timer); setShowInitiation(false) }
    window.addEventListener('jarvis-data-updated', reset)
    return () => { clearTimeout(timer); window.removeEventListener('jarvis-data-updated', reset) }
  }, [])

  // Crisis mode — everything stops
  if (crisis) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="glass-card p-6 border-l-4 card-enter" style={{ borderLeftColor: '#d4a853' }}>
          <p className="font-body text-sm text-text leading-relaxed">{crisis.message}</p>
          <p className="font-mono text-[8px] text-text-muted mt-3 tracking-wider">JARVIS is in quiet mode. Your pace, Sir.</p>
        </div>
      </div>
    )
  }

  // Decision Eliminator — energy ≤ 2, single card replaces everything
  if (energy <= 2) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <DecisionEliminator onAction={(action) => {
          if (action?.type === 'mode') window.dispatchEvent(new CustomEvent('jarvis-open-mode', { detail: { mode: action.mode } }))
        }} />
        <WorkingThread />
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto stagger-enter">
      {/* Context Recovery Card — after 10+ min absence */}
      {showContextRecovery && <ContextRecoveryCard onResume={() => {}} onDismiss={() => setShowContextRecovery(false)} />}

      {/* Initiation Card — after 3 min stalling */}
      {showInitiation && <InitiationCard onDismiss={() => setShowInitiation(false)} />}

      {/* Weakness notification */}
      {weakness && <WeaknessNotification weakness={weakness} onTap={onWeaknessTap} onDismiss={onWeaknessDismiss} />}

      {/* Relationship milestone */}
      {milestone && !dismissedMilestone && (
        <div className="glass-card p-4 border card-enter" style={{ borderColor: '#d4a853', borderWidth: 2 }}>
          <p className="font-body text-sm text-text leading-relaxed">{milestone.message}</p>
          <button onClick={() => setDismissedMilestone(true)}
            className="font-mono text-[8px] text-gold mt-2 tracking-wider hover:opacity-80 transition-opacity">ACKNOWLEDGED</button>
        </div>
      )}

      {/* JARVIS internal reflection */}
      {reflection && (
        <div className="px-2">
          <p className="font-mono text-[9px] text-text-muted italic leading-relaxed" style={{ opacity: 0.5 }}>
            // {reflection}
          </p>
        </div>
      )}

      {/* Overnight Memo */}
      {memoVisible && overnightMemo && (
        <div className="p-3 rounded-lg" style={{ border: '1px dashed rgba(212,168,83,0.3)', borderTop: '2px solid #d4a853', background: 'rgba(212,168,83,0.02)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[9px] text-gold tracking-widest">OVERNIGHT MEMO</span>
            <span className="font-mono text-[8px] text-text-muted">
              {new Date(overnightMemo.processedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="font-body text-[11px] text-text-dim mb-2 italic">
            While you were away, I processed {overnightMemo.dataPointsProcessed} data points. {overnightMemo.findings.length} findings:
          </p>
          <div className="space-y-1.5">
            {overnightMemo.findings.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="font-display text-[10px] text-gold mt-0.5">{i + 1}.</span>
                <p className="font-body text-[11px] text-text leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
          <button onClick={() => { setMemoVisible(false); localStorage.removeItem('jos-overnight-memo') }}
            className="font-mono text-[8px] text-text-muted mt-2 hover:text-gold transition-colors">ACKNOWLEDGED</button>
        </div>
      )}

      {/* Morning Briefing */}
      <div><Briefing /></div>

      {/* JARVIS Proactive Suggestion — optimal action right now */}
      <ProactiveSuggestion onAction={(action) => {
        if (action?.type === 'mode') window.dispatchEvent(new CustomEvent('jarvis-open-mode', { detail: { mode: action.mode } }))
        if (action?.type === 'checkin') window.dispatchEvent(new CustomEvent('jarvis-open-checkin'))
      }} />

      {/* Proactive JARVIS observation */}
      {topObservation && (
        <div className="glass-card p-3 card-enter" style={{ borderLeftWidth: 3, borderLeftColor: topObservation.priority === 1 ? '#d4a853' : '#00b4d8' }}>
          <p className="font-body text-xs text-text leading-relaxed">{topObservation.text}</p>
          <button onClick={() => setDismissedObs(prev => new Set([...prev, topObservation.type]))}
            className="font-mono text-[8px] text-text-muted hover:text-cyan mt-1 tracking-wider transition-colors">
            ACKNOWLEDGED
          </button>
        </div>
      )}

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
      {/* Ghost cards */}
      {ghostCards.map(gc => (
        <GhostCard key={gc.id} id={gc.id} onDismiss={() => setGhostCards(prev => prev.filter(c => c.id !== gc.id))}>
          <p className="font-body text-[11px] text-text-dim leading-relaxed pr-6">{gc.text}</p>
        </GhostCard>
      ))}

      <div><DailyBuildLog /></div>
      {!isShowMode && <div><SecondBrain /></div>}

      {/* JARVIS Investigations */}
      {investigations.length > 0 && (
        <div className="mt-2">
          <span className="font-display text-sm font-bold tracking-wider uppercase" style={{ color: '#00b4d8' }}>JARVIS INVESTIGATIONS</span>
          <div className="space-y-2 mt-2">
            {investigations.map(inv => (
              <div key={inv.id} className="p-3 rounded-lg" style={{ border: '1px dashed rgba(0,180,216,0.2)', background: 'rgba(0,180,216,0.02)' }}>
                <p className="font-body text-[11px] text-text-dim italic mb-1">"{inv.opener}"</p>
                <p className="font-body text-xs text-text leading-relaxed">{inv.text}</p>
                {inv.action && (
                  <button className="font-mono text-[9px] text-cyan border border-cyan/30 px-2 py-1 rounded hover:bg-cyan/10 transition-all mt-2">
                    {inv.action.label}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isShowMode && <div><TimeCapsule /></div>}

      {/* Working Thread — today's running memory */}
      <WorkingThread />
    </div>
  )
}
