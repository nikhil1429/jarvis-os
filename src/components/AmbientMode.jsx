// AmbientMode.jsx — JARVIS's resting state. Alive but quiet. Tap to wake.

import { useState, useEffect, useRef } from 'react'

export default function AmbientMode({ onWake }) {
  const [time, setTime] = useState(new Date())
  const [stat, setStat] = useState(0)
  const canvasRef = useRef(null)

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const stats = []
  try {
    const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
    stats.push(`streak: ${core.streak || 0} days`)
    stats.push(`tasks: ${(core.completedTasks || []).length}/82`)
  } catch { /* ok */ }

  useEffect(() => {
    if (stats.length === 0) return
    const interval = setInterval(() => setStat(s => (s + 1) % stats.length), 30000)
    return () => clearInterval(interval)
  }, [stats.length])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const S = 120, C = 60
    let t = 0, animId
    const draw = () => {
      t += 0.008
      ctx.clearRect(0, 0, S, S)
      ctx.beginPath()
      ctx.arc(C, C, 30, t, t + Math.PI * 1.5)
      ctx.strokeStyle = 'rgba(0,180,216,0.15)'; ctx.lineWidth = 1; ctx.stroke()
      const pulse = 1 + Math.sin(t * 3) * 0.1
      const grad = ctx.createRadialGradient(C, C, 0, C, C, 6 * pulse)
      grad.addColorStop(0, 'rgba(212,168,83,0.4)'); grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.beginPath(); ctx.arc(C, C, 6 * pulse, 0, Math.PI * 2); ctx.fill()
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center cursor-pointer"
      style={{ background: '#020a13' }} onClick={onWake}>
      <canvas ref={canvasRef} width={120} height={120} style={{ width: 80, height: 80, opacity: 0.7, marginBottom: 24 }} />
      <p className="font-mono text-2xl tracking-widest" style={{ color: 'rgba(0,180,216,0.4)' }}>
        {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
      </p>
      <p className="font-mono text-[10px] tracking-widest mt-1" style={{ color: 'rgba(90,122,148,0.4)' }}>
        {time.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
      <div className="mt-8" style={{ opacity: 0.3 }}>
        <p className="font-mono text-[9px] tracking-widest text-text-muted text-center">{stats[stat] || ''}</p>
      </div>
      <p className="absolute bottom-8 font-mono text-[8px] tracking-widest" style={{ color: 'rgba(90,122,148,0.2)' }}>TAP TO WAKE</p>
    </div>
  )
}
