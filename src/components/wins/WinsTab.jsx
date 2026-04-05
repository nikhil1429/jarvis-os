// WinsTab.jsx — Trophy Room (Tab 6) with rarity tiers, progress, and expand-on-tap
// WHY: Achievements need to FEEL like achievements. Locked cards create aspiration,
// unlocked cards create pride. Rarity tiers add collection dopamine.

import { useState } from 'react'
import { Trophy, Lock, ChevronDown, ChevronUp } from 'lucide-react'
import ACHIEVEMENTS from '../../data/achievements.js'
import useStorage from '../../hooks/useStorage.js'

// Rarity tiers — maps achievement ID to tier
const RARITY = {
  'first-blood': 'common', 'streak-starter': 'common', 'self-aware': 'common', 'motormouth': 'common',
  'week-warrior': 'rare', 'concept-collector': 'rare', 'data-driven': 'rare', 'battle-tested': 'rare',
  'code-surgeon': 'rare', 'bomb-survivor': 'rare', 'time-traveler': 'rare',
  'fortnight': 'epic', 'knowledge-base': 'epic', 'chatterbox': 'epic', 'week-streak': 'epic', 'halfway': 'epic',
  'brain-full': 'legendary', 'finisher': 'legendary',
}

const RARITY_COLORS = {
  common: { border: 'rgba(0,180,216,0.3)', glow: 'rgba(0,180,216,0.08)', text: '#00b4d8', label: 'COMMON' },
  rare: { border: 'rgba(212,168,83,0.4)', glow: 'rgba(212,168,83,0.1)', text: '#d4a853', label: 'RARE' },
  epic: { border: 'rgba(212,168,83,0.6)', glow: 'rgba(212,168,83,0.2)', text: '#d4a853', label: 'EPIC' },
  legendary: { border: 'rgba(255,215,0,0.7)', glow: 'rgba(255,215,0,0.25)', text: '#ffd700', label: 'LEGENDARY' },
}

// Progress tracking for progressive achievements
const PROGRESS_MAP = {
  'streak-starter': { field: 'streak', target: 3 },
  'week-streak': { field: 'streak', target: 7 },
  'fortnight': { field: 'streak', target: 14 },
  'motormouth': { field: 'totalMessages', target: 100 },
  'chatterbox': { field: 'totalMessages', target: 500 },
  'concept-collector': { field: 'conceptsAbove60', target: 5 },
  'knowledge-base': { field: 'conceptsAbove60', target: 15 },
  'brain-full': { field: 'conceptsAbove60', target: 35 },
  'self-aware': { field: 'totalCheckIns', target: 7 },
  'data-driven': { field: 'totalCheckIns', target: 21 },
  'first-blood': { field: 'tasksCompleted', target: 1 },
  'halfway': { field: 'tasksCompleted', target: 41 },
  'finisher': { field: 'tasksCompleted', target: 82 },
  'battle-tested': { field: 'battleMessages', target: 10 },
  'code-surgeon': { field: 'codeAutopsySessions', target: 5 },
  'bomb-survivor': { field: 'scenarioBombSessions', target: 5 },
  'time-traveler': { field: 'timeCapsules', target: 3 },
}

function getAppState(get) {
  const core = get('core') || {}
  const concepts = get('concepts') || []
  const feelings = get('feelings') || []
  const totalMessages = ['chat', 'quiz', 'presser', 'battle', 'teach', 'body-double', 'timed', 'speed',
    'interview-sim', 'alter-ego', 'impostor-killer', 'code-autopsy', 'scenario-bomb', 'forensics',
    'recruiter-ghost', 'akshay-qs', 'weakness-radar', 'phantom']
    .reduce((sum, mode) => sum + ((get(`msgs-${mode}`) || []).filter(m => m.role === 'user').length), 0)

  return {
    tasksCompleted: (core.completedTasks || []).length,
    streak: core.streak || 0,
    totalMessages,
    conceptsAbove60: concepts.filter(c => (c.strength || 0) >= 60).length,
    totalCheckIns: feelings.length,
    battleMessages: (get('msgs-battle') || []).filter(m => m.role === 'user').length,
    codeAutopsySessions: (get('msgs-code-autopsy') || []).filter(m => m.role === 'user').length,
    scenarioBombSessions: (get('msgs-scenario-bomb') || []).filter(m => m.role === 'user').length,
    timeCapsules: (get('time-capsules') || []).length,
  }
}

export default function WinsTab() {
  const { get } = useStorage()
  const unlocked = get('achievements') || []
  const unlockedMap = Object.fromEntries(unlocked.map(a => [a.id, a]))
  const appState = getAppState(get)
  const [expandedId, setExpandedId] = useState(null)

  const unlockedCount = unlocked.length
  const rarityCounts = { common: 0, rare: 0, epic: 0, legendary: 0 }
  unlocked.forEach(a => { const r = RARITY[a.id]; if (r) rarityCounts[r]++ })

  // Find closest-to-unlocking achievement
  let closestAchievement = null
  let closestProgress = 0
  for (const achievement of ACHIEVEMENTS) {
    if (unlockedMap[achievement.id]) continue
    const prog = PROGRESS_MAP[achievement.id]
    if (!prog) continue
    const current = appState[prog.field] || 0
    const pct = Math.min(1, current / prog.target)
    if (pct > closestProgress) {
      closestProgress = pct
      closestAchievement = { ...achievement, current, target: prog.target, pct }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-gold" />
          <h2 className="font-display text-xl font-bold text-gold tracking-wider uppercase gold-heading">
            Trophy Room
          </h2>
        </div>
        <span className="font-mono text-xs text-text-dim tracking-wider">
          {unlockedCount}/{ACHIEVEMENTS.length} UNLOCKED
        </span>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 mb-4 font-mono text-[10px] tracking-wider">
        {rarityCounts.common > 0 && <span style={{ color: RARITY_COLORS.common.text }}>{rarityCounts.common} COMMON</span>}
        {rarityCounts.rare > 0 && <span style={{ color: RARITY_COLORS.rare.text }}>{rarityCounts.rare} RARE</span>}
        {rarityCounts.epic > 0 && <span style={{ color: RARITY_COLORS.epic.text }}>{rarityCounts.epic} EPIC</span>}
        {rarityCounts.legendary > 0 && <span style={{ color: RARITY_COLORS.legendary.text }}>{rarityCounts.legendary} LEGENDARY</span>}
      </div>

      {/* Next closest achievement */}
      {closestAchievement && (
        <div className="glass-card p-3 mb-4 border" style={{ borderColor: 'rgba(0,180,216,0.2)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[9px] text-cyan tracking-widest">NEXT UNLOCK</span>
            <span className="font-mono text-[10px] text-text-dim">
              {closestAchievement.current}/{closestAchievement.target}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg">{closestAchievement.emoji}</span>
            <span className="font-display text-sm font-bold text-text tracking-wider">{closestAchievement.name}</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: '#0d2137', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2, transition: 'width 0.5s',
              width: `${Math.round(closestAchievement.pct * 100)}%`,
              background: 'linear-gradient(90deg, #00b4d8, #00f0ff)',
            }} />
          </div>
        </div>
      )}

      {/* Achievement grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ACHIEVEMENTS.map(achievement => {
          const isUnlocked = !!unlockedMap[achievement.id]
          const unlockData = unlockedMap[achievement.id]
          const rarity = RARITY[achievement.id] || 'common'
          const colors = RARITY_COLORS[rarity]
          const isExpanded = expandedId === achievement.id
          const prog = PROGRESS_MAP[achievement.id]
          const current = prog ? (appState[prog.field] || 0) : 0
          const target = prog ? prog.target : 1
          const pctDone = Math.min(1, current / target)

          return (
            <div
              key={achievement.id}
              onClick={() => setExpandedId(isExpanded ? null : achievement.id)}
              className={`glass-card p-3 text-center transition-all duration-300 cursor-pointer ${
                isUnlocked ? '' : 'opacity-50 grayscale'
              }`}
              style={isUnlocked ? {
                borderColor: colors.border,
                boxShadow: `0 0 20px ${colors.glow}`,
              } : undefined}
            >
              {/* Rarity label */}
              {isUnlocked && rarity !== 'common' && (
                <div className="mb-1">
                  <span className="font-mono text-[8px] tracking-widest px-1.5 py-0.5 rounded"
                    style={{ color: colors.text, background: `${colors.text}15`, border: `1px solid ${colors.text}30` }}>
                    {colors.label}
                  </span>
                </div>
              )}

              {/* Emoji / Lock */}
              <div className="text-2xl mb-1.5 relative inline-block">
                {isUnlocked ? (
                  achievement.emoji
                ) : (
                  <span className="relative">
                    <span className="opacity-30">{achievement.emoji}</span>
                    <Lock size={12} className="absolute -bottom-0.5 -right-0.5 text-text-muted" />
                  </span>
                )}
              </div>

              {/* Name */}
              <h4 className={`font-display text-xs font-bold tracking-wider mb-0.5 ${
                isUnlocked ? '' : 'text-text-muted'
              }`} style={isUnlocked ? { color: colors.text } : undefined}>
                {achievement.name}
              </h4>

              {/* Description */}
              <p className="font-body text-[9px] text-text-dim leading-relaxed">
                {achievement.description}
              </p>

              {/* Progress bar (for locked progressive achievements) */}
              {!isUnlocked && prog && pctDone > 0 && (
                <div className="mt-1.5">
                  <div style={{ height: 3, borderRadius: 2, background: '#0d2137', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${Math.round(pctDone * 100)}%`,
                      background: '#00b4d8',
                    }} />
                  </div>
                  <span className="font-mono text-[8px] text-text-muted mt-0.5 block">
                    {current}/{target}
                  </span>
                </div>
              )}

              {/* Unlock date */}
              {isUnlocked && unlockData?.unlockedAt && (
                <p className="font-mono text-[8px] mt-1" style={{ color: `${colors.text}99` }}>
                  {new Date(unlockData.unlockedAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </p>
              )}

              {/* Expanded details */}
              {isExpanded && isUnlocked && (
                <div className="mt-2 pt-2 border-t" style={{ borderColor: `${colors.text}20` }}>
                  <p className="font-mono text-[8px] text-text-dim">
                    {rarity.toUpperCase()} TIER
                  </p>
                  {unlockData?.unlockedAt && (
                    <p className="font-mono text-[8px] text-text-muted mt-0.5">
                      Unlocked {new Date(unlockData.unlockedAt).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              )}

              {/* Expand indicator */}
              {isUnlocked && (
                <div className="mt-1">
                  {isExpanded
                    ? <ChevronUp size={10} className="inline text-text-muted" />
                    : <ChevronDown size={10} className="inline text-text-muted" />
                  }
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
