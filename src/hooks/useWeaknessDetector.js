// useWeaknessDetector.js — Watches quiz scores, detects repeated failures, finds root cause
import { useEffect, useCallback, useState } from 'react'
import CONCEPTS from '../data/concepts.js'

function findRootCause(conceptName) {
  try {
    const saved = JSON.parse(localStorage.getItem('jos-concepts') || '[]')
    const concept = CONCEPTS.find(c => c.name.toLowerCase().includes(conceptName.toLowerCase()))
    if (!concept) return null
    const visited = new Set()
    let weakest = { name: concept.name, strength: (saved.find(s => s.id === concept.id) || {}).strength || 0, id: concept.id }

    function traverse(c) {
      if (visited.has(c.id)) return
      visited.add(c.id)
      const s = (saved.find(x => x.id === c.id) || {}).strength || 0
      if (s < weakest.strength) weakest = { name: c.name, strength: s, id: c.id }
      ;(c.prerequisites || []).forEach(pid => {
        const pre = CONCEPTS.find(x => x.id === pid)
        if (pre) traverse(pre)
      })
    }
    traverse(concept)
    return weakest.id !== concept.id ? weakest : null
  } catch { return null }
}

export default function useWeaknessDetector(eventBus) {
  const [weakness, setWeakness] = useState(null)

  useEffect(() => {
    const onScore = (data) => {
      if (!data || data.score >= 5) return
      // Check: 2+ previous low scores on same concept
      try {
        const msgs = JSON.parse(localStorage.getItem('jos-msgs-quiz') || '[]')
        const lowCount = msgs.filter(m => m.role === 'assistant' && m.content?.includes(data.concept))
          .filter(m => { const s = m.content?.match(/\[QUIZ_SCORE:(\d+)/); return s && parseInt(s[1]) < 5 }).length
        if (lowCount >= 2) {
          const root = findRootCause(data.concept)
          if (root) {
            setWeakness({ concept: data.concept, rootCause: root.name, rootCauseStrength: root.strength })
          }
        }
      } catch { /* ok */ }
    }
    const unsub = eventBus.subscribe('quiz:score', onScore)
    return () => unsub?.()
  }, [eventBus])

  const dismissWeakness = useCallback(() => setWeakness(null), [])
  return { weakness, dismissWeakness }
}
