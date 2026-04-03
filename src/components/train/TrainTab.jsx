// TrainTab.jsx — Training Deck with 18 AI mode cards + Auto-Quiz Trigger
// WHY: The TRAIN tab is the core learning interface. Each mode card shows
// emoji, name, tier badge, and description. Clicking a card opens the ChatView.
// Phase 6: Auto-quiz trigger — checks jos-concepts on render, shows glowing amber
// alert for concepts below 60% or overdue for spaced repetition review.

import { useState, useMemo, useEffect, useCallback } from 'react'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import MODES from '../../data/modes.js'
import CONCEPTS from '../../data/concepts.js'
import { getAntiCrutchLevel } from '../../data/prompts.js'
import { getReviewSchedule } from '../../utils/spacedRepetition.js'
import useStorage from '../../hooks/useStorage.js'
import ChatView from './ChatView.jsx'
import BodyDoubleTimer from './BodyDoubleTimer.jsx'
import PhantomMode from './PhantomMode.jsx'
import BattleRoyale from './BattleRoyale.jsx'
// tilt effect removed — clean hover instead

const TIER_STYLES = {
  1: { label: 'T1', bg: 'bg-cyan/10', border: 'border-cyan/30', text: 'text-cyan' },
  2: { label: 'T2', bg: 'bg-gold/10', border: 'border-gold/30', text: 'text-gold' },
  3: { label: 'T3', bg: 'bg-gold/20', border: 'border-gold/50', text: 'text-gold' },
}

export default function TrainTab({ weekNumber, requestedMode, onModeOpened }) {
  const [activeMode, setActiveMode] = useState(null)
  const [showPhantom, setShowPhantom] = useState(false)
  const [showBattle, setShowBattle] = useState(false)
  const [autoMic, setAutoMic] = useState(false)
  const { get } = useStorage()
  const antiCrutch = getAntiCrutchLevel(weekNumber)

  // External navigation request (from GlobalMic / voice command)

  // Listen for jarvis-open-mode events (from GlobalMic)
  // WHY: Auto-quiz trigger — find concepts that need urgent review.
  // Criteria: strength < 60% OR overdue for spaced repetition.
  // Show max 2, sorted by urgency (most overdue first).

  const handleModeSwitch = useCallback((modeId) => {
    setActiveMode(modeId)
    setAutoMic(true)
  }, [])

  const overdueAlerts = useMemo(() => {
    const savedConcepts = get('concepts') || []
    const alerts = []

    CONCEPTS.forEach(concept => {
      const saved = savedConcepts.find(s => s.id === concept.id) || {}
      const strength = saved.strength || 0
      const schedule = getReviewSchedule(saved)

      if (strength < 60 || schedule.isOverdue) {
        alerts.push({
          id: concept.id,
          name: concept.name,
          strength,
          isOverdue: schedule.isOverdue,
          daysOverdue: schedule.daysOverdue,
          urgency: schedule.urgency,
        })
      }
    })

    // Sort: most overdue first, then lowest strength
    alerts.sort((a, b) => {
      if (a.daysOverdue !== b.daysOverdue) return b.daysOverdue - a.daysOverdue
      return a.strength - b.strength
    })

    return alerts.slice(0, 2)
  }, [get])

  useEffect(() => {
    if (requestedMode) {
      setActiveMode(requestedMode)
      setAutoMic(true)
      onModeOpened?.()
    }
  }, [requestedMode, onModeOpened])

  useEffect(() => {
    const handler = (e) => {
      const modeId = e.detail?.mode || 'chat'
      setActiveMode(modeId)
      setAutoMic(true)
    }
    window.addEventListener('jarvis-open-mode', handler)
    return () => window.removeEventListener('jarvis-open-mode', handler)
  }, [])


  // Body Double mode has its own special UI
  if (activeMode === 'body-double') {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setActiveMode(null)}
          className="flex items-center gap-2 text-text-dim hover:text-cyan transition-colors mb-4"
        >
          <ArrowLeft size={18} />
          <span className="font-mono text-xs tracking-wider">BACK TO MODES</span>
        </button>
        <BodyDoubleTimer />
      </div>
    )
  }

  // If a mode is selected, show ChatView
  if (activeMode) {
    const mode = MODES.find(m => m.id === activeMode)
    return (
      <ChatView
        mode={mode}
        weekNumber={weekNumber}
        onBack={() => { setActiveMode(null); setAutoMic(false) }}
        onModeSwitch={handleModeSwitch}
        autoMic={autoMic}
      />
    )
  }

  // Mode grid
  return (
    <div className="max-w-2xl mx-auto">
      {/* Anti-crutch badge */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold text-cyan tracking-wider uppercase neon-heading">
          Training Deck
        </h2>
        <span
          className="font-mono text-[10px] tracking-widest px-2.5 py-1 rounded border"
          style={{
            color: antiCrutch.color,
            borderColor: antiCrutch.color + '60',
            backgroundColor: antiCrutch.color + '15',
          }}
        >
          {antiCrutch.label}
        </span>
      </div>

      {/* Emergency modes */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setShowPhantom(true)}
          className="flex-1 glass-card px-3 py-2 text-center border hover:bg-red-500/10 transition-all"
          style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
          <span className="font-display text-[10px] font-bold tracking-wider" style={{ color: '#ef4444' }}>PHANTOM MODE</span>
        </button>
        <button onClick={() => setShowBattle(true)}
          className="flex-1 glass-card px-3 py-2 text-center border hover:bg-gold/10 transition-all"
          style={{ borderColor: 'rgba(212,168,83,0.3)' }}>
          <span className="font-display text-[10px] font-bold tracking-wider" style={{ color: '#d4a853' }}>BATTLE ROYALE</span>
        </button>
      </div>

      {showPhantom && <PhantomMode onClose={() => setShowPhantom(false)} />}
      {showBattle && <BattleRoyale onClose={() => setShowBattle(false)} />}

      {/* Auto-Quiz Alert Cards */}
      {overdueAlerts.length > 0 && (
        <div className="space-y-2 mb-4">
          {overdueAlerts.map(alert => (
            <button
              key={alert.id}
              onClick={() => setActiveMode('quiz')}
              className="w-full glass-card p-3 text-left transition-all duration-200
                border border-amber-500/30 hover:border-amber-500/60
                animate-pulse-slow"
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(6, 20, 34, 1) 100%)',
                boxShadow: '0 0 12px rgba(245, 158, 11, 0.1)',
              }}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-display text-sm font-bold text-amber-300">
                    {alert.name} ({alert.strength}%)
                    {alert.isOverdue && alert.daysOverdue > 0 && (
                      <span className="text-amber-400/70 font-normal"> — {alert.daysOverdue}d overdue</span>
                    )}
                  </p>
                  <p className="font-mono text-[10px] text-amber-400/60 tracking-wider mt-0.5">
                    NEEDS REVIEW — QUIZ NOW?
                  </p>
                </div>
                <span className="font-mono text-xs text-amber-400">→</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 2-column grid of mode cards */}
      <div className="grid grid-cols-2 gap-3">
        {MODES.map(mode => {
          const tier = TIER_STYLES[mode.tier]
          return (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className="glass-card p-3 text-left transition-all duration-200
                hover:border-cyan/30 hover:translate-y-[-2px] group"
            >
              <div className="hud-panel-inner">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{mode.emoji}</span>
                    <span className="font-display text-sm font-bold text-text tracking-wide
                      group-hover:text-cyan transition-colors">
                      {mode.name}
                    </span>
                  </div>
                  <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded
                    ${tier.bg} ${tier.border} ${tier.text} border`}>
                    {tier.label}
                  </span>
                </div>

                <p className="font-body text-[11px] text-text-dim leading-relaxed line-clamp-2">
                  {mode.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
