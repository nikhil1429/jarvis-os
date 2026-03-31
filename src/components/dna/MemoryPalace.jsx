// MemoryPalace.jsx — 3D concept nebula using Three.js
// WHY: Visual star field where each concept is a glowing sphere. Size = strength,
// color = mastery level. Lines connect prerequisites. Mouse orbit + zoom.

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import CONCEPTS from '../../data/concepts.js'
import useStorage from '../../hooks/useStorage.js'

function getColor(strength) {
  if (strength >= 80) return 0xd4a853
  if (strength >= 60) return 0x10b981
  if (strength >= 30) return 0xeab308
  return 0xef4444
}

function fibSphere(i, total, radius) {
  const golden = Math.PI * (3 - Math.sqrt(5))
  const y = 1 - (i / (total - 1)) * 2
  const r = Math.sqrt(1 - y * y)
  const theta = golden * i
  return new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius)
}

export default function MemoryPalace() {
  const containerRef = useRef(null)
  const { get } = useStorage()
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const saved = get('concepts') || []
    const w = container.clientWidth
    const h = Math.min(400, window.innerHeight * 0.45)

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x010810, 0.015)
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200)
    camera.position.set(0, 0, 40)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0x00b4d8, 0.3))
    const pl = new THREE.PointLight(0x00f0ff, 1.5, 80)
    scene.add(pl)

    const conceptMeshes = []
    CONCEPTS.forEach((concept, i) => {
      const s = saved.find(x => x.id === concept.id)
      const strength = s?.strength || 0
      const pos = fibSphere(i, CONCEPTS.length, 18)
      const radius = 0.4 + (strength / 100) * 1.2
      const color = getColor(strength)
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 16),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, transparent: true, opacity: 0.85 })
      )
      mesh.position.copy(pos)
      mesh.userData = { name: concept.name, strength, category: concept.category }
      scene.add(mesh)
      conceptMeshes.push(mesh)
      // Glow
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 2.5, 12, 12),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.06 })
      )
      glow.position.copy(pos)
      scene.add(glow)
    })

    // Prerequisite lines
    CONCEPTS.forEach((c, i) => {
      (c.prerequisites || []).forEach(preId => {
        const j = CONCEPTS.findIndex(x => x.id === preId)
        if (j === -1) return
        const geo = new THREE.BufferGeometry().setFromPoints([conceptMeshes[i].position, conceptMeshes[j].position])
        scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x00b4d8, transparent: true, opacity: 0.08 })))
      })
    })

    // Dust
    const dustPos = new Float32Array(800 * 3), dustCol = new Float32Array(800 * 3)
    for (let i = 0; i < 800; i++) {
      dustPos[i*3] = (Math.random()-0.5)*60; dustPos[i*3+1] = (Math.random()-0.5)*60; dustPos[i*3+2] = (Math.random()-0.5)*60
      const g = Math.random() < 0.15
      dustCol[i*3] = g?0.83:0; dustCol[i*3+1] = g?0.66:0.71; dustCol[i*3+2] = g?0.33:0.85
    }
    const dGeo = new THREE.BufferGeometry()
    dGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
    dGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3))
    scene.add(new THREE.Points(dGeo, new THREE.PointsMaterial({ size: 0.15, vertexColors: true, transparent: true, opacity: 0.5 })))

    // Orbit
    let drag = false, px = 0, py = 0, rotY = 0, rotX = 0, dist = 40
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2()

    const onDown = (e) => { drag = true; px = e.clientX; py = e.clientY }
    const onUp = () => { drag = false }
    const onMove = (e) => {
      const rect = container.getBoundingClientRect()
      mouse.x = ((e.clientX-rect.left)/w)*2-1; mouse.y = -((e.clientY-rect.top)/h)*2+1
      if (drag) { rotY += (e.clientX-px)*0.005; rotX = Math.max(-1.2, Math.min(1.2, rotX+(e.clientY-py)*0.005)); px = e.clientX; py = e.clientY }
      ray.setFromCamera(mouse, camera)
      const hits = ray.intersectObjects(conceptMeshes)
      setTooltip(hits.length ? { ...hits[0].object.userData, x: e.clientX-rect.left, y: e.clientY-rect.top } : null)
    }
    const onWheel = (e) => { dist = Math.max(20, Math.min(80, dist + e.deltaY*0.05)); e.preventDefault() }

    const el = renderer.domElement
    el.addEventListener('pointerdown', onDown); el.addEventListener('pointerup', onUp)
    el.addEventListener('pointermove', onMove); el.addEventListener('wheel', onWheel, { passive: false })

    let animId
    const clock = new THREE.Clock()
    const animate = () => {
      animId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      if (!drag) rotY += 0.001
      camera.position.set(Math.sin(rotY)*Math.cos(rotX)*dist, Math.sin(rotX)*dist, Math.cos(rotY)*Math.cos(rotX)*dist)
      camera.lookAt(0, 0, 0)
      conceptMeshes.forEach((m, i) => { const s = 1+Math.sin(t*2+i*0.5)*0.08; m.scale.set(s,s,s) })
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => { const nw = container.clientWidth; camera.aspect = nw/h; camera.updateProjectionMatrix(); renderer.setSize(nw, h) }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId); window.removeEventListener('resize', onResize)
      el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointermove', onMove); el.removeEventListener('wheel', onWheel)
      renderer.dispose()
      scene.traverse(o => { if(o.geometry)o.geometry.dispose(); if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose()} })
      if (container.contains(el)) container.removeChild(el)
    }
  }, [get])

  return (
    <div ref={containerRef} className="relative rounded overflow-hidden" style={{ minHeight: 350, background: '#010810' }}>
      {tooltip && (
        <div className="glass-card px-3 py-2 pointer-events-none" style={{ position: 'absolute', left: tooltip.x+12, top: tooltip.y-40, zIndex: 10, whiteSpace: 'nowrap' }}>
          <p className="font-display text-xs font-bold text-text">{tooltip.name}</p>
          <p className="font-mono text-[10px] text-cyan">{tooltip.strength}% · {tooltip.category}</p>
        </div>
      )}
    </div>
  )
}
