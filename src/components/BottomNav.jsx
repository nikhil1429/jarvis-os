// BottomNav.jsx — Glass 6-tab navigation with neon active state

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
    <nav className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(1,8,16,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(0,240,255,0.06)',
        boxShadow: '0 -2px 20px rgba(0,0,0,0.3)',
      }}>
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id
          return (
            <button key={id} onClick={() => onTabChange(id)}
              className="relative flex flex-col items-center gap-1 py-3 px-4 transition-all duration-300"
              style={{ color: isActive ? '#00f0ff' : '#2a4a60' }}
              aria-label={label}>

              {isActive && (
                <>
                  {/* Glowing dot above line */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: '#00f0ff', boxShadow: '0 0 6px #00f0ff, 0 0 12px rgba(0,240,255,0.3)' }} />
                  {/* Top line */}
                  <div className="absolute top-[3px] left-3 right-3 h-[2px] rounded-full"
                    style={{ backgroundColor: '#00f0ff', boxShadow: '0 0 8px #00f0ff' }} />
                </>
              )}

              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.5} />
                {id === 'cmd' && hasPulse && !isActive && (
                  <div className="absolute -top-1 -right-1.5 w-2 h-2 bg-cyan rounded-full"
                    style={{ boxShadow: '0 0 6px #00f0ff' }} />
                )}
              </div>

              <span className="font-display text-[10px] font-semibold" style={{ letterSpacing: '0.12em' }}>
                {label}
              </span>

              {isActive && (
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(180deg, rgba(0,240,255,0.06) 0%, transparent 60%)' }} />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
