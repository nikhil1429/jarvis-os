// WinsTab.jsx — Trophy Room (Tab 6) with 18 achievement cards
// WHY: Achievements are tangible proof of progress. Locked cards create aspiration,
// unlocked cards create pride. The grid layout lets Nikhil see all 18 at once —
// watching them light up over weeks is deeply motivating for ADHD brains.

import { Trophy, Lock } from 'lucide-react'
import ACHIEVEMENTS from '../../data/achievements.js'
import useStorage from '../../hooks/useStorage.js'
// tilt effect removed — clean hover instead

export default function WinsTab() {
  const { get } = useStorage()
  const unlocked = get('achievements') || []
  const unlockedMap = Object.fromEntries(unlocked.map(a => [a.id, a]))

  const unlockedCount = unlocked.length

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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

      {/* Achievement grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ACHIEVEMENTS.map(achievement => {
          const isUnlocked = !!unlockedMap[achievement.id]
          const unlockData = unlockedMap[achievement.id]

          return (
            <div
              key={achievement.id}
              className={`glass-card p-4 text-center transition-all duration-300 hover:translate-y-[-2px] ${
                isUnlocked ? 'achievement-unlocked' : 'achievement-locked grayscale'
              }`}
              style={isUnlocked ? {
                borderColor: 'rgba(0,240,255,0.3)',
                boxShadow: '0 0 20px rgba(0,240,255,0.08)',
              } : undefined}
            >
              <div className="hud-panel-inner">
                {/* Emoji / Lock */}
                <div className="text-3xl mb-2 relative inline-block">
                  {isUnlocked ? (
                    achievement.emoji
                  ) : (
                    <span className="relative">
                      <span className="opacity-30">{achievement.emoji}</span>
                      <Lock size={14} className="absolute -bottom-1 -right-1 text-text-muted" />
                    </span>
                  )}
                </div>

                {/* Name */}
                <h4 className={`font-display text-sm font-bold tracking-wider mb-1 ${
                  isUnlocked ? 'text-gold' : 'text-text-muted'
                }`}>
                  {achievement.name}
                </h4>

                {/* Description */}
                <p className="font-body text-[10px] text-text-dim leading-relaxed">
                  {achievement.description}
                </p>

                {/* Unlock date */}
                {isUnlocked && unlockData?.unlockedAt && (
                  <p className="font-mono text-[8px] text-gold/60 mt-2 tracking-wider">
                    {new Date(unlockData.unlockedAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
