// BackgroundCanvas.jsx — Living background: particles, grid, data rain, scan line
// WHY: Makes the void feel alive. Particles create neural-network connections,
// grid provides depth, data rain adds digital texture. All at ~60fps.

import { useEffect, useRef } from 'react'

const PARTICLE_COUNT_DESKTOP = 120
const PARTICLE_COUNT_MOBILE = 60
const CONNECTION_DISTANCE = 80
const MOUSE_ATTRACT_DISTANCE = 120

export default function BackgroundCanvas() {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -999, y: -999 })
  const animRef = useRef(null)
  const trailRef = useRef([]) // cursor trail positions
  const scrollRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w
    canvas.height = h

    const isMobile = w < 768
    const particleCount = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP

    // Get mood state for color/speed shift
    let energyLevel = 3, isLateNight = false
    try {
      const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
      energyLevel = core.energy || 3
      const hour = new Date().getHours()
      isLateNight = hour >= 23 || hour < 5
    } catch { /* ok */ }

    // Particles
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: 1 + Math.random() * 2,
      isGold: Math.random() < 0.15,
    }))

    // Data rain columns
    const rainCols = Array.from({ length: isMobile ? 4 : 7 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      speed: 0.5 + Math.random() * 1.5,
      chars: Array.from({ length: 12 }, () => Math.random() > 0.5 ? '1' : '0'),
    }))

    // Scan line
    let scanY = 0

    const handleResize = () => {
      w = window.innerWidth; h = window.innerHeight
      canvas.width = w; canvas.height = h
    }
    const handleMouse = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
      // Cursor trail
      trailRef.current.push({ x: e.clientX, y: e.clientY, life: 1 })
      if (trailRef.current.length > 25) trailRef.current.shift()
    }
    const handleScroll = () => { scrollRef.current = window.scrollY }
    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouse)
    window.addEventListener('scroll', handleScroll, { passive: true })

    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      // 1. Tron grid (perspective)
      ctx.strokeStyle = 'rgba(0, 180, 216, 0.025)'
      ctx.lineWidth = 0.5
      const gridSpacing = 60
      // Horizontal lines
      for (let y = 0; y < h; y += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
      }
      // Vertical lines (converging toward center-bottom)
      const vanishX = w / 2, vanishY = h
      for (let x = 0; x < w; x += gridSpacing) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(vanishX + (x - vanishX) * 0.3, vanishY)
        ctx.stroke()
      }

      // 2. Data rain
      ctx.font = '10px "Share Tech Mono", monospace'
      ctx.fillStyle = 'rgba(0, 240, 255, 0.06)'
      rainCols.forEach(col => {
        col.chars.forEach((ch, i) => {
          ctx.fillText(ch, col.x, col.y + i * 14)
        })
        col.y += col.speed
        if (col.y > h) { col.y = -170; col.x = Math.random() * w }
      })

      // 3. Particles + connections
      const mx = mouseRef.current.x, my = mouseRef.current.y
      const cyan = isLateNight ? [212, 168, 83] : energyLevel <= 2 ? [180, 80, 80] : [0, 180, 216]

      particles.forEach(p => {
        // Mouse attraction
        const dx = mx - p.x, dy = my - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < MOUSE_ATTRACT_DISTANCE && dist > 0) {
          const force = (MOUSE_ATTRACT_DISTANCE - dist) / MOUSE_ATTRACT_DISTANCE * 0.015
          p.vx += dx / dist * force
          p.vy += dy / dist * force
        }

        p.x += p.vx; p.y += p.vy

        // Damping
        p.vx *= 0.999; p.vy *= 0.999

        // Wrap
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0

        // Draw particle
        const color = p.isGold ? `rgba(212, 168, 83, 0.5)` : `rgba(${cyan[0]}, ${cyan[1]}, ${cyan[2]}, 0.4)`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      })

      // Neural connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DISTANCE) {
            const opacity = (1 - dist / CONNECTION_DISTANCE) * 0.12
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(0, 180, 216, ${opacity})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      // 4. Scan line (with parallax offset)
      const scrollOff = scrollRef.current * 0.05
      scanY = (scanY + 0.5) % h
      const gradient = ctx.createLinearGradient(0, scanY, w, scanY)
      gradient.addColorStop(0, 'transparent')
      gradient.addColorStop(0.5, 'rgba(0, 240, 255, 0.06)')
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.fillRect(0, scanY - scrollOff, w, 2)

      // 5. Cursor trail
      const trail = trailRef.current
      for (let t = 0; t < trail.length; t++) {
        trail[t].life -= 0.035
        if (trail[t].life <= 0) continue
        const pt = trail[t]
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, pt.life * 4, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 240, 255, ${pt.life * 0.4})`
        ctx.fill()
        // Connect consecutive trail points
        if (t > 0 && trail[t - 1].life > 0) {
          ctx.beginPath()
          ctx.moveTo(trail[t - 1].x, trail[t - 1].y)
          ctx.lineTo(pt.x, pt.y)
          ctx.strokeStyle = `rgba(0, 240, 255, ${pt.life * 0.15})`
          ctx.lineWidth = pt.life * 2
          ctx.stroke()
        }
      }
      trailRef.current = trail.filter(p => p.life > 0)

      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouse)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        zIndex: 0, pointerEvents: 'none',
      }}
    />
  )
}
