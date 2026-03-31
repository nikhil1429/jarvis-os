// Header.jsx — HUD Header Bar with reactor, neon rank, live indicator

import { Settings } from 'lucide-react'

function MiniReactor() {
  return (
    <div className="relative w-9 h-9 flex items-center justify-center">
      <div className="absolute w-2.5 h-2.5 rounded-full core-pulse"
        style={{ backgroundColor: '#d4a853', boxShadow: '0 0 8px #d4a853, 0 0 16px rgba(212,168,83,0.4)' }} />
      <svg className="absolute w-9 h-9 reactor-ring-1" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="14" stroke="#00b4d8" strokeWidth="0.8" opacity="0.6" strokeDasharray="4 6" />
      </svg>
      <svg className="absolute w-7 h-7 reactor-ring-2" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="10" stroke="#00f0ff" strokeWidth="0.6" opacity="0.4" strokeDasharray="3 5" />
      </svg>
      <svg className="absolute w-5 h-5 reactor-ring-3" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="#d4a853" strokeWidth="0.5" opacity="0.3" strokeDasharray="2 4" />
      </svg>
    </div>
  )
}

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const ENERGY_COLORS = { 1: '#ef4444', 2: '#ef4444', 3: '#eab308', 4: '#22c55e', 5: '#22c55e' }

export default function Header({ dayNumber, weekNumber, streak, elapsed, rank, energy, onEnergyChange, onSettingsClick }) {
  return (
    <header className="flex items-center justify-between px-4 py-2"
      style={{
        background: 'linear-gradient(180deg, rgba(6,20,34,0.9), rgba(2,10,19,0.85))',
        borderBottom: '1px solid rgba(0,240,255,0.08)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 1px 12px rgba(0,180,216,0.05)',
      }}>

      {/* Left: Reactor + Rank + Live */}
      <div className="flex items-center gap-3">
        <MiniReactor />
        <div>
          <span className="font-display text-sm font-bold tracking-wider uppercase neon-pulse"
            style={{ color: '#d4a853' }}>
            {rank || 'RECRUIT'}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-[5px] h-[5px] rounded-full live-blink" style={{ backgroundColor: '#22c55e', color: '#22c55e' }} />
            <span className="font-mono text-[8px] tracking-widest" style={{ color: '#5a7a94' }}>NEURAL LINK ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Center: Day/Week + Energy */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs tracking-widest" style={{ color: '#5a7a94' }}>
          DAY {dayNumber || 1} · W{weekNumber || 1}
        </span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(level => (
            <button key={level} onClick={() => onEnergyChange?.(level)}
              className="w-2.5 h-2.5 rounded-full border transition-all duration-200"
              style={{
                backgroundColor: level <= (energy || 3) ? ENERGY_COLORS[energy || 3] : 'transparent',
                borderColor: level <= (energy || 3) ? ENERGY_COLORS[energy || 3] : '#2a4a60',
                boxShadow: level <= (energy || 3) ? `0 0 6px ${ENERGY_COLORS[energy || 3]}50` : 'none',
              }}
              aria-label={`Energy level ${level}`} />
          ))}
        </div>
      </div>

      {/* Right: Streak + Timer + Settings */}
      <div className="flex items-center gap-4">
        <span className="font-display text-sm font-bold gold-neon-pulse" style={{ color: '#d4a853' }}>
          🔥 {streak || 0}
        </span>
        <span className="font-mono text-xs neon-pulse" style={{ color: '#00b4d8' }}>
          {formatTime(elapsed || 0)}
        </span>
        <button onClick={onSettingsClick}
          className="text-text-dim hover:text-cyan transition-colors duration-300 hover:rotate-90"
          style={{ transition: 'color 0.3s, transform 0.5s' }}
          aria-label="Settings">
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}
