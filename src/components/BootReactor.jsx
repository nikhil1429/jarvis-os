// BootReactor.jsx — Three.js 3D Arc Reactor with 12 scene elements + phase-aware rendering
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const TAU = Math.PI * 2
const ADD = THREE.AdditiveBlending

function makeMat(color, opacity, add = true) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: add ? ADD : THREE.NormalBlending, side: THREE.DoubleSide, depthWrite: false })
}

export default function BootReactor({ phase = 'running' }) {
  const containerRef = useRef(null)
  const phaseRef = useRef(phase)
  const intensityRef = useRef(phase === 'void' ? 0 : 1)
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    phaseRef.current = phase
    // Smooth intensity targets
    const targets = { void: 0, ignition: 1.2, running: 1, ambient: 0.5, briefing: 0.75, exit: 0 }
    intensityRef.target = targets[phase] ?? 1
  }, [phase])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const W = el.clientWidth, H = el.clientHeight
    const mobile = window.innerWidth < 768
    const dpr = Math.min(window.devicePixelRatio, mobile ? 1.5 : 2)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false })
    renderer.setSize(W, H); renderer.setPixelRatio(dpr); renderer.setClearColor(0x020a13)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 500)
    camera.position.set(0, 2.5, 13)

    // Track all disposables
    const geos = [], mats = [], texs = []
    const g = (geo) => { geos.push(geo); return geo }
    const m = (mat) => { mats.push(mat); return mat }

    // ===== 1. NEBULA (600/300 particles) =====
    const nebCount = mobile ? 300 : 600
    const nebGeo = g(new THREE.BufferGeometry())
    const nebPos = new Float32Array(nebCount * 3), nebCol = new Float32Array(nebCount * 3)
    for (let i = 0; i < nebCount; i++) {
      const r = 15 + Math.random() * 40, th = Math.random() * TAU, ph = Math.acos(2 * Math.random() - 1)
      nebPos[i*3] = r * Math.sin(ph) * Math.cos(th); nebPos[i*3+1] = r * Math.sin(ph) * Math.sin(th); nebPos[i*3+2] = r * Math.cos(ph)
      const c = Math.random() < 0.1 ? new THREE.Color(0xd4a853) : Math.random() < 0.35 ? new THREE.Color(0x00b4d8) : new THREE.Color(0x1a2a3a)
      nebCol[i*3] = c.r; nebCol[i*3+1] = c.g; nebCol[i*3+2] = c.b
    }
    nebGeo.setAttribute('position', new THREE.BufferAttribute(nebPos, 3))
    nebGeo.setAttribute('color', new THREE.BufferAttribute(nebCol, 3))
    const nebMat = m(new THREE.PointsMaterial({ size: 0.15, vertexColors: true, transparent: true, opacity: 0.4, blending: ADD, depthWrite: false }))
    scene.add(new THREE.Points(nebGeo, nebMat))

    // ===== 2. CORE (4 glow layers) =====
    const coreGroup = new THREE.Group()
    const coreLayers = [
      { r: 0.3, color: 0xffffff, op: 1 },
      { r: 0.5, color: 0xffd080, op: 0.6 },
      { r: 0.9, color: 0xd4a853, op: 0.2 },
      { r: 1.4, color: 0x00b4d8, op: 0.06 },
    ].map(l => {
      const mesh = new THREE.Mesh(g(new THREE.SphereGeometry(l.r, 24, 24)), m(makeMat(l.color, l.op)))
      coreGroup.add(mesh); return mesh
    })
    scene.add(coreGroup)

    // ===== 3. RINGS (6/4 segmented) =====
    const ringDefs = [
      { r: 2.0, tube: 0.035, color: 0x00f0ff, tiltX: 0.4, tiltZ: 0.15, speed: 0.007, op: 0.8 },
      { r: 2.7, tube: 0.025, color: 0x00b4d8, tiltX: -0.6, tiltZ: 0.35, speed: -0.005, op: 0.55 },
      { r: 3.4, tube: 0.04, color: 0xd4a853, tiltX: 0.8, tiltZ: -0.25, speed: 0.004, op: 0.7 },
      { r: 1.4, tube: 0.02, color: 0x48cae4, tiltX: -0.15, tiltZ: 0.9, speed: -0.012, op: 0.45 },
      ...(!mobile ? [
        { r: 4.5, tube: 0.02, color: 0x00b4d8, tiltX: 0.2, tiltZ: -0.6, speed: 0.003, op: 0.3 },
        { r: 5.2, tube: 0.015, color: 0x00f0ff, tiltX: -0.4, tiltZ: 0.1, speed: -0.002, op: 0.15 },
      ] : []),
    ]
    const ringsGroup = new THREE.Group()
    const ringMeshes = ringDefs.map(d => {
      const geo = g(new THREE.TorusGeometry(d.r, d.tube, 16, 80, TAU * 0.85))
      const mat = m(makeMat(d.color, d.op))
      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.set(d.tiltX, 0, d.tiltZ)
      mesh.userData = { speed: d.speed, baseOp: d.op }
      ringsGroup.add(mesh); return mesh
    })
    scene.add(ringsGroup)

    // ===== 4. ENERGY DOTS (12/8) =====
    const dots = []
    ringDefs.slice(0, mobile ? 2 : 4).forEach((rd, ri) => {
      for (let d = 0; d < 3; d++) {
        const dotG = new THREE.Group()
        const bright = new THREE.Mesh(g(new THREE.SphereGeometry(0.06, 8, 8)), m(makeMat(rd.color, 1)))
        const glow = new THREE.Mesh(g(new THREE.SphereGeometry(0.15, 8, 8)), m(makeMat(rd.color, 0.3)))
        dotG.add(bright, glow)
        scene.add(dotG)
        dots.push({ group: dotG, ring: rd, angle: d / 3 * TAU + ri * 0.5, speed: 0.02 + Math.random() * 0.02 })
      }
    })

    // ===== 5. HOUSING (10 segments) =====
    const housingGroup = new THREE.Group()
    for (let s = 0; s < 10; s++) {
      const isGold = s % 4 === 0
      const arcGeo = g(new THREE.TorusGeometry(5.5, 0.03, 8, 20, 0.42))
      const arcMat = m(new THREE.MeshBasicMaterial({ color: isGold ? 0xd4a853 : 0x0d2137, transparent: true, opacity: isGold ? 0.8 : 0.5, blending: ADD, depthWrite: false }))
      const arc = new THREE.Mesh(arcGeo, arcMat)
      arc.rotation.y = s / 10 * TAU
      housingGroup.add(arc)
      if (isGold) {
        const node = new THREE.Mesh(g(new THREE.SphereGeometry(0.05, 8, 8)), m(makeMat(0xd4a853, 0.9)))
        node.position.set(Math.cos(0.42) * 5.5, 0, Math.sin(0.42) * 5.5)
        arc.add(node)
      }
    }
    scene.add(housingGroup)

    // ===== 6. HOLOGRAPHIC SHIELD =====
    const shieldGroup = new THREE.Group()
    const shieldSphere = new THREE.Mesh(g(new THREE.SphereGeometry(6, 32, 32)), m(new THREE.MeshBasicMaterial({ color: 0x00b4d8, transparent: true, opacity: 0.015, side: THREE.BackSide, blending: ADD })))
    const wireGeo = g(new THREE.IcosahedronGeometry(6.1, 2))
    const wireMat = m(new THREE.MeshBasicMaterial({ color: 0x00b4d8, wireframe: true, transparent: true, opacity: 0.04, blending: ADD }))
    const wireMesh = new THREE.Mesh(wireGeo, wireMat)
    shieldGroup.add(shieldSphere, wireMesh)
    scene.add(shieldGroup)

    // ===== 7. PARTICLES (300/150) =====
    const pCount = mobile ? 150 : 300
    const pGeo = g(new THREE.BufferGeometry())
    const pPos = new Float32Array(pCount * 3), pCol = new Float32Array(pCount * 3), pVel = []
    for (let i = 0; i < pCount; i++) {
      const r = 1 + Math.random() * 6, th = Math.random() * TAU, ph = Math.acos(2 * Math.random() - 1)
      pPos[i*3] = r * Math.sin(ph) * Math.cos(th); pPos[i*3+1] = r * Math.sin(ph) * Math.sin(th); pPos[i*3+2] = r * Math.cos(ph)
      const isGold = Math.random() < 0.2
      const c = isGold ? new THREE.Color(0xd4a853) : new THREE.Color(0x00b4d8)
      pCol[i*3] = c.r; pCol[i*3+1] = c.g; pCol[i*3+2] = c.b
      pVel.push({ x: (Math.random()-0.5)*0.01, y: (Math.random()-0.5)*0.01, z: (Math.random()-0.5)*0.01 })
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3))
    const pMat = m(new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.6, blending: ADD, sizeAttenuation: true, depthWrite: false }))
    scene.add(new THREE.Points(pGeo, pMat))

    // ===== SHOCKWAVE + LIGHTNING state =====
    const shockwaves = [], lightnings = []
    let lastShock = 0, lastLightning = 0

    // Mouse
    const onMouse = (e) => {
      const rect = el.getBoundingClientRect()
      mouseRef.current = { x: ((e.clientX - rect.left) / W - 0.5) * 2, y: -((e.clientY - rect.top) / H - 0.5) * 2 }
    }
    el.addEventListener('pointermove', onMouse)

    // Resize
    const onResize = () => {
      const nw = el.clientWidth, nh = el.clientHeight
      camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    // ===== ANIMATION LOOP =====
    let t = 0, animId
    const animate = () => {
      animId = requestAnimationFrame(animate)
      t += 0.016

      // Intensity lerp
      const target = intensityRef.target ?? 1
      intensityRef.current += (target - intensityRef.current) * 0.03
      const I = intensityRef.current

      // Camera orbit + parallax
      const mx = mouseRef.current.x, my = mouseRef.current.y
      camera.position.x = Math.sin(t * 0.12) * 13 + mx * 3
      camera.position.z = Math.cos(t * 0.12) * 13
      camera.position.y = 2.5 + Math.sin(t * 0.25) * 1 + my * 2
      camera.lookAt(0, 0, 0)

      // Core pulse
      const pulse = 1 + Math.sin(t * 2) * 0.1 + Math.sin(t * 5) * 0.03
      coreGroup.scale.setScalar(pulse * Math.max(0.01, I))
      coreGroup.visible = I > 0.05

      // Rings rotation + opacity
      ringMeshes.forEach(rm => {
        rm.rotation.y += rm.userData.speed * (I > 0.3 ? 1 : 0.3)
        rm.material.opacity = rm.userData.baseOp * I
      })
      ringsGroup.visible = I > 0.1

      // Energy dots
      dots.forEach(d => {
        d.angle += d.speed * I
        const x = Math.cos(d.angle) * d.ring.r
        const z = Math.sin(d.angle) * d.ring.r
        d.group.position.set(x, 0, z)
        d.group.rotation.set(d.ring.tiltX, 0, d.ring.tiltZ)
        d.group.visible = I > 0.2
      })

      // Housing rotation
      housingGroup.rotation.y += 0.0008
      housingGroup.visible = I > 0.3

      // Shield breathe
      const sb = 1 + Math.sin(t * 0.7) * 0.02
      shieldGroup.scale.setScalar(sb)
      wireMesh.rotation.x += 0.0003; wireMesh.rotation.y += 0.0005
      shieldGroup.visible = I > 0.2

      // Particles drift
      const pos = pGeo.attributes.position.array
      for (let i = 0; i < pCount; i++) {
        pos[i*3] += pVel[i].x; pos[i*3+1] += pVel[i].y; pos[i*3+2] += pVel[i].z
        const r = Math.sqrt(pos[i*3]**2 + pos[i*3+1]**2 + pos[i*3+2]**2)
        if (r > 7 || r < 0.8) { pVel[i].x *= -1; pVel[i].y *= -1; pVel[i].z *= -1 }
      }
      pGeo.attributes.position.needsUpdate = true
      pMat.opacity = 0.6 * I

      // Shockwave pulses (every 2.5s)
      if (t - lastShock > 2.5 && I > 0.5 && !mobile) {
        lastShock = t
        const sg = g(new THREE.RingGeometry(0.5, 0.6, 32))
        const sm = m(new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.5, blending: ADD, side: THREE.DoubleSide, depthWrite: false }))
        const sw = new THREE.Mesh(sg, sm)
        sw.rotation.x = -Math.PI / 2
        scene.add(sw)
        shockwaves.push({ mesh: sw, birth: t })
      }
      shockwaves.forEach((sw, i) => {
        const age = t - sw.birth
        if (age > 3) { scene.remove(sw.mesh); sw.mesh.geometry.dispose(); sw.mesh.material.dispose(); shockwaves.splice(i, 1); return }
        const s = 0.5 + age / 3 * 8; sw.mesh.scale.setScalar(s)
        sw.mesh.material.opacity = (1 - age / 3) * 0.5
      })

      // Lightning (every 0.8-2.8s)
      if (!mobile && t - lastLightning > 0.8 + Math.random() * 2 && I > 0.6) {
        lastLightning = t
        const pts = []; const angle = Math.random() * TAU; const len = 2 + Math.random() * 3
        for (let p = 0; p <= 8; p++) {
          const r = (p / 8) * len
          pts.push(new THREE.Vector3(Math.cos(angle) * r + (Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5, Math.sin(angle) * r + (Math.random()-0.5)*0.5))
        }
        const lg = g(new THREE.BufferGeometry().setFromPoints(pts))
        const lm = m(new THREE.LineBasicMaterial({ color: Math.random() > 0.3 ? 0x00f0ff : 0xd4a853, transparent: true, opacity: 0.8, blending: ADD }))
        const line = new THREE.Line(lg, lm)
        scene.add(line)
        lightnings.push({ line, birth: t })
      }
      lightnings.forEach((l, i) => {
        if (t - l.birth > 0.3) { scene.remove(l.line); l.line.geometry.dispose(); l.line.material.dispose(); lightnings.splice(i, 1) }
      })

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      el.removeEventListener('pointermove', onMouse)
      window.removeEventListener('resize', onResize)
      geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); texs.forEach(t => t.dispose())
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} style={{ width: 'min(90vw, 500px)', height: 'min(90vw, 500px)', margin: '0 auto' }} />
}
