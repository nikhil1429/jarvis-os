// Header.jsx — HUD Header Bar
// WHY: The header is always visible after boot. It shows the mini arc reactor (system alive),
// rank (motivation), day/week counter (progress), streak (consistency), session timer
// (accountability), and settings access. It's the "status bar" of JARVIS OS — one glance
// tells you everything about your current state.

import { Settings } from 'lucide-react'

// WHY SVG reactor instead of Three.js: the header reactor is tiny (32px). Three.js would be
// overkill for this size — an animated SVG with CSS rotation gives the same spinning-ring
// effect at a fraction of the performance cost.
function MiniReactor() {
  return (
    <div className="relative w-8 h-8 flex items-center justify-center">
      {/* Core glow */}
      <div className="absolute w-3 h-3 rounded-full bg-gold animate-breathe"
        style={{ boxShadow: '0 0 8px #d4a853, 0 0 16px rgba(212, 168, 83, 0.4)' }}
      />
      {/* Ring 1 — slow spin */}
      <svg className="absolute w-8 h-8 animate-reactor-spin" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="12" stroke="#00b4d8" strokeWidth="0.8" opacity="0.6"
          strokeDasharray="4 6" />
      </svg>
      {/* Ring 2 — counter-spin (CSS reverses direction) */}
      <svg className="absolute w-6 h-6" viewBox="0 0 24 24" fill="none"
        style={{ animation: 'reactor-spin 5s linear infinite reverse' }}>
        <circle cx="12" cy="12" r="9" stroke="#00f0ff" strokeWidth="0.6" opacity="0.4"
          strokeDasharray="3 5" />
      </svg>
    </div>
  )
}

// WHY: Format seconds into HH:MM:SS for the session timer display
function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// WHY energy colors: visual mapping so Nikhil can glance at energy level instantly.
// 1-2 = red (low), 3 = yellow (mid), 4-5 = green (high). Drives ADHD energy matching.
const ENERGY_COLORS = {
  1: '#ef4444', 2: '#ef4444', 3: '#eab308', 4: '#22c55e', 5: '#22c55e'
}

export default function Header({ dayNumber, weekNumber, streak, elapsed, rank, energy, onEnergyChange, onSettingsClick }) {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-card border-b border-border"
      style={{ boxShadow: '0 1px 8px rgba(0, 180, 216, 0.05)' }}>

      {/* Left section: Reactor + Rank */}
      <div className="flex items-center gap-3">
        <MiniReactor />
        <span className="font-display text-sm font-semibold text-gold tracking-wider uppercase">
          {rank || 'RECRUIT'} PANWAR
        </span>
      </div>

      {/* Center: Day/Week + Energy */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-text-dim tracking-widest">
          DAY {dayNumber || 1} | W{weekNumber || 1}
        </span>

        {/* Energy level selector — 5 dots */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(level => (
            <button
              key={level}
              onClick={() => onEnergyChange?.(level)}
              className="w-2.5 h-2.5 rounded-full border transition-all duration-200"
              style={{
                backgroundColor: level <= (energy || 3) ? ENERGY_COLORS[energy || 3] : 'transparent',
                borderColor: level <= (energy || 3) ? ENERGY_COLORS[energy || 3] : '#2a4a60',
                boxShadow: level <= (energy || 3) ? `0 0 4px ${ENERGY_COLORS[energy || 3]}40` : 'none',
              }}
              aria-label={`Energy level ${level}`}
            />
          ))}
        </div>
      </div>

      {/* Right section: Streak + Timer + Settings */}
      <div className="flex items-center gap-4">
        {/* Streak counter */}
        <span className="font-display text-sm text-gold animate-breathe">
          🔥 {streak || 0}
        </span>

        {/* Session timer */}
        <span className="font-mono text-xs text-cyan">
          {formatTime(elapsed || 0)}
        </span>

        {/* Settings gear */}
        <button
          onClick={onSettingsClick}
          className="text-text-dim hover:text-cyan transition-colors duration-200"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}
