// AnimatedNumber.jsx — Count-up from 0 on mount
import { useState, useEffect, useRef } from 'react'

export default function AnimatedNumber({ value, duration = 600, suffix = '', className = '' }) {
  const [display, setDisplay] = useState(0)
  const startTime = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    startTime.current = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) animRef.current = requestAnimationFrame(animate)
    }
    animate()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [value, duration])

  return <span className={className}>{display}{suffix}</span>
}
