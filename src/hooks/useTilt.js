// useTilt.js — React hook for 3D tilt effect on cards
import { useEffect, useRef } from 'react'
import { initTilt } from '../utils/tiltEffect.js'

export default function useTilt() {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) initTilt(ref.current)
  }, [])
  return ref
}
