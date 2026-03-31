// BottomNav.jsx — 6-Tab Navigation Bar
// WHY: JARVIS OS has 6 main tabs, each a different "mode" of the system.
// Phase 6: Added notification dot support for pulse alerts on CMD tab.

import { Zap, Target, MessageCircle, Dna, BarChart3, Trophy } from 'lucide-react'

const TABS = [
  { id: 'cmd',   label: 'CMD',   Icon: Zap },
  { id: 'train', label: 'TRAIN', Icon: Target },
  { id: 'log',   label: 'LOG',   Icon: MessageCircle },
  { id: 'dna',   label: 'DNA',   Icon: Dna },
  { id: 'stats', label: 'STATS', Icon: BarChart3 },
  { id: 'wins',  label: 'WINS',  Icon: Trophy },
]

export default function BottomNav({ activeTab, onTabChange, hasPulse }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50"
      style={{ boxShadow: '0 -1px 8px rgba(0, 180, 216, 0.05)' }}>
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`
                relative flex flex-col items-center gap-1 py-3 px-4 transition-all duration-200
                ${isActive ? 'text-cyan' : 'text-text-dim hover:text-text'}
              `}
              aria-label={label}
            >
              {isActive && (
                <div className="absolute top-0 left-2 right-2 h-0.5 bg-cyan-neon rounded-full"
                  style={{ boxShadow: '0 0 6px #00f0ff' }} />
              )}

              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.5} />

                {/* WHY: Pulse notification dot on CMD tab when new pulse arrives
                    and user is on a different tab. Cyan dot draws attention without
                    being intrusive. */}
                {id === 'cmd' && hasPulse && !isActive && (
                  <div
                    className="absolute -top-1 -right-1.5 w-2 h-2 bg-cyan rounded-full"
                    style={{ boxShadow: '0 0 6px #00f0ff' }}
                  />
                )}
              </div>

              <span className={`font-mono text-[10px] tracking-wider
                ${isActive ? 'text-cyan' : 'text-text-dim'}`}>
                {label}
              </span>

              {isActive && (
                <div className="absolute inset-0 pointer-events-none"
                  style={{ boxShadow: 'inset 0 -8px 16px rgba(0, 180, 216, 0.08)' }} />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
