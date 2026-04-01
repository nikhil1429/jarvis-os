// Header.jsx — HUD Header Bar with reactor, neon rank, live indicator

import { useEffect, useRef } from 'react'
import { Settings, Cloud, CloudOff } from 'lucide-react'
import { isSupabaseConfigured } from '../utils/supabase.js'

function MiniReactor({ energy = 3 }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const S = 80, C = 40 // internal size, center
    const intensity = energy >= 4 ? 1.4 : energy <= 2 ? 0.5 : 1
    const speed = energy >= 4 ? 1.5 : energy <= 2 ? 0.5 : 1

    // Particles
    const particles = Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * Math.PI * 2,
      radius: 12 + Math.random() * 6,
      speed: (0.02 + Math.random() * 0.02) * speed * (i % 2 === 0 ? 1 : -1),
      size: 1 + Math.random(),
      isGold: i < 2,
    }))

    let t = 0
    const draw = () => {
      t += 0.033 * speed
      ctx.clearRect(0, 0, S, S)

      // Ring arcs
      ;[{ r: 18, s: t * 1.2, c: `rgba(0,180,216,${0.4 * intensity})` },
        { r: 14, s: -t * 0.8, c: `rgba(0,240,255,${0.3 * intensity})` }].forEach(ring => {
        ctx.beginPath()
        ctx.arc(C, C, ring.r, ring.s, ring.s + Math.PI * 1.4)
        ctx.strokeStyle = ring.c; ctx.lineWidth = 1; ctx.stroke()
      })

      // Orbiting particles
      particles.forEach(p => {
        p.angle += p.speed
        const px = C + Math.cos(p.angle) * p.radius
        const py = C + Math.sin(p.angle) * p.radius
        ctx.beginPath(); ctx.arc(px, py, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.isGold ? `rgba(212,168,83,${0.6 * intensity})` : `rgba(0,240,255,${0.5 * intensity})`
        ctx.fill()
      })

      // Gold core
      const pulse = 1 + Math.sin(t * 2.5) * 0.15
      const coreGrad = ctx.createRadialGradient(C, C, 0, C, C, 8 * pulse)
      coreGrad.addColorStop(0, `rgba(255,255,255,${0.8 * intensity})`)
      coreGrad.addColorStop(0.4, `rgba(212,168,83,${0.5 * intensity})`)
      coreGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = coreGrad
      ctx.beginPath(); ctx.arc(C, C, 8 * pulse, 0, Math.PI * 2); ctx.fill()

      // White-hot center
      ctx.beginPath(); ctx.arc(C, C, 2, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.shadowBlur = 8 * intensity; ctx.shadowColor = '#ffd080'
      ctx.fill(); ctx.shadowBlur = 0

      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [energy])

  return <canvas ref={canvasRef} width={80} height={80} style={{ width: 40, height: 40, flexShrink: 0 }} />
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
        <MiniReactor energy={energy} />
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
        <span title={isSupabaseConfigured() ? 'Cloud sync active' : 'Local only'}>
          {isSupabaseConfigured() ? <Cloud size={12} style={{ color: '#10b981', opacity: 0.6 }} /> : <CloudOff size={12} style={{ color: '#5a7a94', opacity: 0.4 }} />}
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
