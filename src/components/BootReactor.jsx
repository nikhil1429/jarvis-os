// BootReactor.jsx — Phase-aware 12-layer quantum nanotech reactor (Canvas 2D)
// Phases: void (particles converge), ignition (sequential reveal), running (full),
// ambient (dimmed for inputs), briefing (80%), exit (scatter outward)

import { useEffect, useRef } from 'react'

const TAU = Math.PI * 2

export default function BootReactor({ phase = 'running' }) {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: 400, y: 400 })
  const animRef = useRef(null)
  const phaseRef = useRef(phase)
  const phaseStartRef = useRef(Date.now())

  useEffect(() => {
    if (phaseRef.current !== phase) {
      phaseRef.current = phase
      phaseStartRef.current = Date.now()
    }
  }, [phase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const S = 800, C = S / 2

    // Particles — used in all phases
    const particles = Array.from({ length: 120 }, (_, i) => {
      const angle = Math.random() * TAU
      const edgeR = 450 + Math.random() * 100
      return {
        x: C + Math.cos(angle) * edgeR, y: C + Math.sin(angle) * edgeR,
        targetX: C + (Math.random() - 0.5) * 40, targetY: C + (Math.random() - 0.5) * 40,
        orbitAngle: Math.random() * TAU,
        orbitR: 40 + Math.random() * 260,
        speed: (0.002 + Math.random() * 0.008) * (Math.random() > 0.5 ? 1 : -1),
        size: 0.5 + Math.random() * 2,
        isGold: Math.random() < 0.25,
      }
    })

    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: ((e.clientX - rect.left) / rect.width) * S, y: ((e.clientY - rect.top) / rect.height) * S }
    }
    canvas.addEventListener('mousemove', handleMouse)

    let t = 0
    const draw = () => {
      t += 0.016
      ctx.clearRect(0, 0, S, S)
      const p = phaseRef.current
      const elapsed = (Date.now() - phaseStartRef.current) / 1000
      const mx = mouseRef.current.x, my = mouseRef.current.y

      // Intensity multiplier
      const intensity = p === 'ambient' ? 0.5 : p === 'briefing' ? 0.75 : p === 'ignition' ? Math.min(1.5, 0.5 + elapsed) : 1
      const speedMult = p === 'ambient' ? 0.5 : p === 'exit' ? 2 : 1

      // === VOID PHASE: only converging particles ===
      if (p === 'void') {
        const convergePct = Math.min(1, elapsed / 1.5)
        particles.forEach(pt => {
          pt.x += (pt.targetX - pt.x) * 0.02 * convergePct
          pt.y += (pt.targetY - pt.y) * 0.02 * convergePct
          const alpha = convergePct * 0.6
          ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, TAU)
          ctx.fillStyle = pt.isGold ? `rgba(212,168,83,${alpha})` : `rgba(0,240,255,${alpha})`
          ctx.fill()
        })
        animRef.current = requestAnimationFrame(draw)
        return
      }

      // === EXIT PHASE: scatter outward ===
      if (p === 'exit') {
        const scatterPct = Math.min(1, elapsed / 0.5)
        particles.forEach(pt => {
          const angle = Math.atan2(pt.y - C, pt.x - C)
          pt.x += Math.cos(angle) * 8 * scatterPct
          pt.y += Math.sin(angle) * 8 * scatterPct
          const alpha = Math.max(0, 0.6 - scatterPct * 0.8)
          ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (1 + scatterPct), 0, TAU)
          ctx.fillStyle = pt.isGold ? `rgba(212,168,83,${alpha})` : `rgba(0,240,255,${alpha})`
          ctx.fill()
        })
        // Fading core
        const coreAlpha = Math.max(0, 1 - scatterPct)
        const cg = ctx.createRadialGradient(C, C, 0, C, C, 50 * coreAlpha)
        cg.addColorStop(0, `rgba(255,255,255,${coreAlpha * 0.5})`); cg.addColorStop(1, 'transparent')
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(C, C, 50, 0, TAU); ctx.fill()
        animRef.current = requestAnimationFrame(draw)
        return
      }

      // === IGNITION + RUNNING + AMBIENT + BRIEFING: full reactor ===
      const revealPct = p === 'ignition' ? Math.min(1, elapsed / 2) : 1

      // L1 — Gravitational lensing
      if (revealPct > 0.3) {
        ;[80, 120, 160, 200, 240, 280].forEach((r, i) => {
          ctx.beginPath()
          for (let a = 0; a < TAU; a += 0.05) {
            const w = r + Math.sin(a * 3 + t + i) * 3
            const x = C + Math.cos(a) * w, y = C + Math.sin(a) * w
            a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.strokeStyle = i % 2 === 0 ? `rgba(0,180,216,${0.025 * intensity})` : `rgba(212,168,83,${0.025 * intensity})`
          ctx.lineWidth = 0.5; ctx.stroke()
        })
      }

      // L3 — Housing segments
      if (revealPct > 0.4) {
        ctx.save(); ctx.translate(C, C); ctx.rotate(t * 0.12 * speedMult)
        const segAlpha = Math.min(1, (revealPct - 0.4) / 0.3)
        for (let seg = 0; seg < 10; seg++) {
          const sa = (seg / 10) * TAU + 0.02, ea = sa + (TAU / 10) * 0.65
          const isGold = seg % 3 === 0 || seg % 5 === 0
          ctx.beginPath(); ctx.arc(0, 0, 310, sa, ea)
          ctx.strokeStyle = isGold ? `rgba(212,168,83,${segAlpha * intensity})` : `rgba(0,180,216,${segAlpha * intensity})`
          ctx.lineWidth = 3
          if (isGold) { ctx.shadowBlur = 12 * intensity; ctx.shadowColor = '#d4a853' }
          ctx.stroke(); ctx.shadowBlur = 0
        }
        ctx.beginPath(); ctx.arc(0, 0, 325, 0, TAU); ctx.strokeStyle = `rgba(0,180,216,${0.08 * intensity})`; ctx.lineWidth = 0.5; ctx.stroke()
        ctx.restore()
      }

      // L4 — Orbiting rings
      if (revealPct > 0.2) {
        ;[240, 200, 170, 140, 110].forEach((r, i) => {
          ctx.save(); ctx.translate(C, C)
          const spd = (i % 2 === 0 ? 1 : -1) * (0.2 + i * 0.08) * speedMult
          ctx.beginPath()
          for (let a = 0; a < TAU; a += 0.03) {
            if ((a > 1.0 && a < 1.3) || (a > 4.0 && a < 4.3)) continue
            ctx.lineTo(Math.cos(a + t * spd) * r, Math.sin(a + t * spd) * r * 0.35)
          }
          const isG = i % 2 === 1
          ctx.strokeStyle = isG ? `rgba(212,168,83,${0.12 * intensity})` : `rgba(0,240,255,${0.1 * intensity})`
          ctx.lineWidth = 1.5; ctx.shadowBlur = 6 * intensity; ctx.shadowColor = isG ? '#d4a853' : '#00f0ff'
          ctx.stroke(); ctx.shadowBlur = 0; ctx.restore()
        })
      }

      // L6 — Triangle
      if (revealPct > 0.5) {
        ctx.save(); ctx.translate(C, C); ctx.rotate(t * -0.15 * speedMult)
        ctx.strokeStyle = `rgba(212,168,83,${0.12 * intensity})`; ctx.lineWidth = 1.5; ctx.beginPath()
        for (let v = 0; v < 3; v++) { const a = v / 3 * TAU - Math.PI / 2; ctx.lineTo(Math.cos(a) * 130, Math.sin(a) * 130) }
        ctx.closePath(); ctx.stroke()
        for (let v = 0; v < 3; v++) {
          const a = v / 3 * TAU - Math.PI / 2
          ctx.beginPath(); ctx.arc(Math.cos(a) * 130, Math.sin(a) * 130, 3, 0, TAU)
          ctx.fillStyle = '#d4a853'; ctx.shadowBlur = 8; ctx.shadowColor = '#d4a853'; ctx.fill(); ctx.shadowBlur = 0
        }
        ctx.restore()
      }

      // L8 — Accretion disk
      if (revealPct > 0.1) {
        ;[35, 45, 55, 65].forEach((r, i) => {
          ctx.beginPath(); ctx.arc(C, C, r, 0, TAU)
          ctx.strokeStyle = i % 2 === 0 ? `rgba(212,168,83,${0.15 * intensity})` : `rgba(0,240,255,${0.12 * intensity})`
          ctx.lineWidth = 1; ctx.shadowBlur = 4 * intensity; ctx.shadowColor = i % 2 === 0 ? '#d4a853' : '#00f0ff'
          ctx.stroke(); ctx.shadowBlur = 0
        })
      }

      // L9 — THE CORE
      const pulse = 1 + Math.sin(t * 2.5) * 0.12
      const coreScale = p === 'ignition' ? Math.min(1, elapsed / 0.5) : 1
      const coreR = 35 * pulse * coreScale
      const aura = ctx.createRadialGradient(C, C, 0, C, C, 70 * pulse * coreScale)
      aura.addColorStop(0, `rgba(255,255,255,${0.6 * intensity})`); aura.addColorStop(0.2, `rgba(255,224,160,${0.3 * intensity})`)
      aura.addColorStop(0.5, `rgba(0,180,216,${0.1 * intensity})`); aura.addColorStop(1, 'transparent')
      ctx.fillStyle = aura; ctx.fillRect(C - 80, C - 80, 160, 160)
      const cg = ctx.createRadialGradient(C, C, 0, C, C, coreR)
      cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.3, '#ffd080'); cg.addColorStop(0.7, `rgba(0,180,216,${0.4 * intensity})`); cg.addColorStop(1, 'transparent')
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(C, C, coreR, 0, TAU); ctx.fill()
      ctx.beginPath(); ctx.arc(C, C, 10 * pulse * coreScale, 0, TAU)
      ctx.fillStyle = '#fff'; ctx.shadowBlur = 40 * intensity; ctx.shadowColor = '#ffd080'; ctx.fill()
      ctx.beginPath(); ctx.arc(C, C, 4 * coreScale, 0, TAU)
      ctx.fillStyle = '#fff'; ctx.shadowBlur = 20; ctx.shadowColor = '#fff'; ctx.fill(); ctx.shadowBlur = 0

      // L10 — Lightning (6% chance, not during ambient)
      if (p !== 'ambient' && Math.random() < 0.06 * intensity) {
        const angle = Math.random() * TAU, len = 50 + Math.random() * 120
        const segs = 5 + Math.floor(Math.random() * 3)
        ctx.beginPath(); ctx.moveTo(C, C)
        for (let s = 1; s <= segs; s++) {
          const r = (s / segs) * len, off = (Math.random() - 0.5) * 30
          ctx.lineTo(C + Math.cos(angle) * r + Math.cos(angle + Math.PI / 2) * off, C + Math.sin(angle) * r + Math.sin(angle + Math.PI / 2) * off)
        }
        ctx.strokeStyle = Math.random() > 0.4 ? '#00f0ff' : '#d4a853'
        ctx.lineWidth = 1.5; ctx.shadowBlur = 8; ctx.shadowColor = ctx.strokeStyle; ctx.stroke(); ctx.shadowBlur = 0
      }

      // L11 — Particle swarm (orbit mode)
      particles.forEach(pt => {
        pt.orbitAngle += pt.speed * speedMult
        let px = C + Math.cos(pt.orbitAngle) * pt.orbitR
        let py = C + Math.sin(pt.orbitAngle) * pt.orbitR
        const dx = mx - px, dy = my - py, dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 100 && dist > 0) { const f = (100 - dist) / 100 * 0.3; px += dx / dist * f * 8; py += dy / dist * f * 8 }
        ctx.beginPath(); ctx.arc(px, py, pt.size, 0, TAU)
        ctx.fillStyle = pt.isGold ? `rgba(212,168,83,${0.6 * intensity})` : `rgba(0,240,255,${0.5 * intensity})`
        ctx.shadowBlur = 4 * intensity; ctx.shadowColor = pt.isGold ? '#d4a853' : '#00f0ff'
        ctx.fill(); ctx.shadowBlur = 0
      })

      // L12 — Cursor energy pull
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 60)
      mg.addColorStop(0, `rgba(0,240,255,${0.06 * intensity})`); mg.addColorStop(1, 'transparent')
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 60, 0, TAU); ctx.fill()

      // Ignition shockwaves
      if (p === 'ignition' && elapsed < 2) {
        ;[0, 0.3, 0.6].forEach(delay => {
          const wt = elapsed - delay
          if (wt > 0 && wt < 1.5) {
            const r = wt / 1.5 * 350
            ctx.beginPath(); ctx.arc(C, C, r, 0, TAU)
            ctx.strokeStyle = `rgba(0,240,255,${(1 - wt / 1.5) * 0.15})`; ctx.lineWidth = 2; ctx.stroke()
          }
        })
      }

      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      canvas.removeEventListener('mousemove', handleMouse)
    }
  }, [])

  return (
    <canvas ref={canvasRef} width={800} height={800}
      style={{ width: 'min(90vw, 420px)', height: 'min(90vw, 420px)', display: 'block', margin: '0 auto' }} />
  )
}
