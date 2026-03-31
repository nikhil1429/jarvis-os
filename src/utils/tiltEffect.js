// tiltEffect.js — 3D tilt on mouse hover with light-follow shine
// WHY: Cards feel spatial and reactive. Max 6 degrees — subtle, not nauseating.

export function initTilt(element) {
  const shine = document.createElement('div')
  shine.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;border-radius:inherit;transition:opacity 0.3s;opacity:0;'
  element.style.position = 'relative'
  element.appendChild(shine)

  element.addEventListener('mousemove', e => {
    const rect = element.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2, cy = rect.height / 2
    const rotX = (y - cy) / cy * -6
    const rotY = (x - cx) / cx * 6
    element.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-2px)`
    element.style.transition = 'transform 0.1s'
    // Light follow
    const px = (x / rect.width * 100).toFixed(0)
    const py = (y / rect.height * 100).toFixed(0)
    shine.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(0,240,255,0.08) 0%, transparent 60%)`
    shine.style.opacity = '1'
  })

  element.addEventListener('mouseleave', () => {
    element.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0)'
    element.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)'
    shine.style.opacity = '0'
  })
}
