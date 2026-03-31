// BootReactor.jsx — 12-layer quantum nanotech singularity reactor (Canvas 2D)
// WHY: Canvas 2D gives more control over glow/gradient effects than Three.js
// MeshBasicMaterial. 12 visual layers create a reactor that looks like nothing else.

import { useEffect, useRef } from 'react'

const TAU = Math.PI * 2

export default function BootReactor({ visible }) {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: 400, y: 400 })
  const animRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const S = 800 // canvas internal size
    const C = S / 2 // center

    // Particles
    const particles = Array.from({ length: 120 }, () => ({
      angle: Math.random() * TAU,
      radius: 40 + Math.random() * 260,
      speed: (0.002 + Math.random() * 0.008) * (Math.random() > 0.5 ? 1 : -1),
      size: 0.5 + Math.random() * 2,
      isGold: Math.random() < 0.25,
    }))

    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: ((e.clientX - rect.left) / rect.width) * S,
        y: ((e.clientY - rect.top) / rect.height) * S,
      }
    }
    canvas.addEventListener('mousemove', handleMouse)

    let t = 0
    const draw = () => {
      t += 0.016
      ctx.clearRect(0, 0, S, S)

      // L1 — Gravitational lensing rings
      ;[80, 120, 160, 200, 240, 280].forEach((r, i) => {
        ctx.beginPath()
        for (let a = 0; a < TAU; a += 0.05) {
          const wobble = r + Math.sin(a * 3 + t + i) * 3
          const x = C + Math.cos(a) * wobble
          const y = C + Math.sin(a) * wobble
          a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(0,180,216,0.025)' : 'rgba(212,168,83,0.025)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      })

      // L2 — Spiral galaxy arms
      for (let arm = 0; arm < 5; arm++) {
        ctx.beginPath()
        const baseAngle = (arm / 5) * TAU + t * 0.3
        for (let j = 0; j < 80; j++) {
          const progress = j / 80
          const r = 15 + progress * 260
          const a = baseAngle + progress * TAU * 2
          const x = C + Math.cos(a) * r, y = C + Math.sin(a) * r
          j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.strokeStyle = arm % 2 === 0 ? 'rgba(0,240,255,0.04)' : 'rgba(212,168,83,0.035)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // L3 — 10-segment outer housing
      ctx.save()
      ctx.translate(C, C)
      ctx.rotate(t * 0.12)
      for (let seg = 0; seg < 10; seg++) {
        const startA = (seg / 10) * TAU + 0.02
        const endA = startA + (TAU / 10) * 0.65
        const isGold = seg % 3 === 0 || seg % 5 === 0
        ctx.beginPath()
        ctx.arc(0, 0, 310, startA, endA)
        ctx.strokeStyle = isGold ? '#d4a853' : '#00b4d8'
        ctx.lineWidth = 3
        if (isGold) { ctx.shadowBlur = 12; ctx.shadowColor = '#d4a853' }
        ctx.stroke()
        ctx.shadowBlur = 0
      }
      // Housing rings
      ctx.beginPath(); ctx.arc(0, 0, 325, 0, TAU); ctx.strokeStyle = 'rgba(0,180,216,0.08)'; ctx.lineWidth = 0.5; ctx.stroke()
      ctx.beginPath(); ctx.arc(0, 0, 295, 0, TAU); ctx.strokeStyle = 'rgba(0,180,216,0.08)'; ctx.lineWidth = 0.5; ctx.stroke()
      ctx.restore()

      // L4 — Multi-plane orbiting rings
      ;[240, 200, 170, 140, 110].forEach((r, i) => {
        ctx.save()
        ctx.translate(C, C)
        const speed = (i % 2 === 0 ? 1 : -1) * (0.2 + i * 0.08)
        const rot = t * speed
        ctx.beginPath()
        for (let a = 0; a < TAU; a += 0.03) {
          // Skip gaps
          if ((a > 1.0 && a < 1.3) || (a > 4.0 && a < 4.3)) continue
          const px = Math.cos(a + rot) * r
          const py = Math.sin(a + rot) * r * 0.35 // tilt
          ctx.lineTo(px, py)
        }
        const isGold = i % 2 === 1
        ctx.strokeStyle = isGold ? 'rgba(212,168,83,0.12)' : 'rgba(0,240,255,0.1)'
        ctx.lineWidth = 1.5
        ctx.shadowBlur = 6
        ctx.shadowColor = isGold ? '#d4a853' : '#00f0ff'
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.restore()
      })

      // L5 — Hex grid micro-structure (simplified)
      ctx.save()
      ctx.translate(C, C)
      ctx.rotate(t * 0.1)
      ctx.strokeStyle = 'rgba(0,180,216,0.018)'
      ctx.lineWidth = 0.5
      for (let row = -4; row <= 4; row++) {
        for (let col = -4; col <= 4; col++) {
          const hx = col * 22 + (row % 2) * 11, hy = row * 19
          const dist = Math.sqrt(hx * hx + hy * hy)
          if (dist < 50 || dist > 130) continue
          ctx.beginPath()
          for (let v = 0; v < 6; v++) { const a = v / 6 * TAU; ctx.lineTo(hx + Math.cos(a) * 10, hy + Math.sin(a) * 10) }
          ctx.closePath(); ctx.stroke()
        }
      }
      ctx.restore()

      // L6 — Triangular inner frame
      ctx.save(); ctx.translate(C, C); ctx.rotate(t * -0.15)
      ctx.strokeStyle = 'rgba(212,168,83,0.12)'; ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let v = 0; v < 3; v++) { const a = v / 3 * TAU - Math.PI / 2; ctx.lineTo(Math.cos(a) * 130, Math.sin(a) * 130) }
      ctx.closePath(); ctx.stroke()
      // Vertex nodes
      for (let v = 0; v < 3; v++) {
        const a = v / 3 * TAU - Math.PI / 2
        ctx.beginPath(); ctx.arc(Math.cos(a) * 130, Math.sin(a) * 130, 3, 0, TAU)
        ctx.fillStyle = '#d4a853'; ctx.shadowBlur = 8; ctx.shadowColor = '#d4a853'; ctx.fill(); ctx.shadowBlur = 0
      }
      ctx.restore()

      // L8 — Event horizon + accretion disk
      const evtGrad = ctx.createRadialGradient(C, C, 0, C, C, 45)
      evtGrad.addColorStop(0, 'rgba(0,0,5,0.8)'); evtGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = evtGrad; ctx.fillRect(C - 50, C - 50, 100, 100)
      ;[35, 45, 55, 65].forEach((r, i) => {
        ctx.beginPath(); ctx.arc(C, C, r, 0, TAU)
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(212,168,83,0.15)' : 'rgba(0,240,255,0.12)'
        ctx.lineWidth = 1; ctx.shadowBlur = 4; ctx.shadowColor = i % 2 === 0 ? '#d4a853' : '#00f0ff'
        ctx.stroke(); ctx.shadowBlur = 0
      })

      // L9 — THE CORE
      const pulse = 1 + Math.sin(t * 2.5) * 0.12
      const coreR = 35 * pulse
      // Outer aura
      const aura = ctx.createRadialGradient(C, C, 0, C, C, 70 * pulse)
      aura.addColorStop(0, 'rgba(255,255,255,0.6)'); aura.addColorStop(0.2, 'rgba(255,224,160,0.3)')
      aura.addColorStop(0.5, 'rgba(0,180,216,0.1)'); aura.addColorStop(1, 'transparent')
      ctx.fillStyle = aura; ctx.fillRect(C - 80, C - 80, 160, 160)
      // Core glow
      const cg = ctx.createRadialGradient(C, C, 0, C, C, coreR)
      cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.3, '#ffd080'); cg.addColorStop(0.7, 'rgba(0,180,216,0.4)'); cg.addColorStop(1, 'transparent')
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(C, C, coreR, 0, TAU); ctx.fill()
      // Intense center
      ctx.beginPath(); ctx.arc(C, C, 10 * pulse, 0, TAU)
      ctx.fillStyle = '#fff'; ctx.shadowBlur = 40; ctx.shadowColor = '#ffd080'; ctx.fill()
      // White-hot point
      ctx.beginPath(); ctx.arc(C, C, 4, 0, TAU)
      ctx.fillStyle = '#fff'; ctx.shadowBlur = 20; ctx.shadowColor = '#fff'; ctx.fill()
      ctx.shadowBlur = 0

      // L10 — Energy lightning bursts (6% chance)
      if (Math.random() < 0.06) {
        const angle = Math.random() * TAU
        const len = 50 + Math.random() * 120
        const segs = 5 + Math.floor(Math.random() * 3)
        ctx.beginPath(); ctx.moveTo(C, C)
        for (let s = 1; s <= segs; s++) {
          const r = (s / segs) * len
          const off = (Math.random() - 0.5) * 30
          ctx.lineTo(C + Math.cos(angle) * r + Math.cos(angle + Math.PI / 2) * off,
            C + Math.sin(angle) * r + Math.sin(angle + Math.PI / 2) * off)
        }
        ctx.strokeStyle = Math.random() > 0.4 ? '#00f0ff' : '#d4a853'
        ctx.lineWidth = 1.5; ctx.shadowBlur = 8; ctx.shadowColor = ctx.strokeStyle
        ctx.stroke(); ctx.shadowBlur = 0
      }

      // L11 — Nanotech particle swarm
      const mx = mouseRef.current.x, my = mouseRef.current.y
      particles.forEach(p => {
        p.angle += p.speed
        let px = C + Math.cos(p.angle) * p.radius
        let py = C + Math.sin(p.angle) * p.radius
        // Mouse attraction
        const dx = mx - px, dy = my - py
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 100 && dist > 0) {
          const force = (100 - dist) / 100 * 0.3
          px += dx / dist * force * 8; py += dy / dist * force * 8
        }
        ctx.beginPath(); ctx.arc(px, py, p.size, 0, TAU)
        ctx.fillStyle = p.isGold ? 'rgba(212,168,83,0.6)' : 'rgba(0,240,255,0.5)'
        ctx.shadowBlur = 4; ctx.shadowColor = p.isGold ? '#d4a853' : '#00f0ff'
        ctx.fill(); ctx.shadowBlur = 0
      })

      // L12 — Cursor energy pull
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 60)
      mg.addColorStop(0, 'rgba(0,240,255,0.06)'); mg.addColorStop(1, 'transparent')
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 60, 0, TAU); ctx.fill()

      animRef.current = requestAnimationFrame(draw)
    }

    if (visible !== false) draw()

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      canvas.removeEventListener('mousemove', handleMouse)
    }
  }, [visible])

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={800}
      style={{
        width: 'min(90vw, 450px)',
        height: 'min(90vw, 450px)',
        display: 'block',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}
    />
  )
}
