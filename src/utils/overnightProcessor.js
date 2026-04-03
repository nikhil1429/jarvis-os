// overnightProcessor.js — JARVIS processes data "overnight"
// On every boot, checks if 6+ hours passed. Runs deep analysis, generates memo.

import { discoverPatterns } from './patternEngine.js'

export function runOvernightProcessing() {
  try {
    const lastBoot = localStorage.getItem('jos-last-boot')
    const now = Date.now()
    const gap = lastBoot ? (now - new Date(lastBoot).getTime()) / 3600000 : 24

    localStorage.setItem('jos-last-boot', new Date().toISOString())

    if (gap < 6) return null

    const findings = []
    const dataPointsProcessed = countDataPoints()

    const patterns = discoverPatterns()
    patterns.forEach(p => {
      if (p.confidence === 'high' || p.confidence === 'medium') {
        findings.push({ type: 'pattern', text: p.text, confidence: p.confidence })
      }
    })

    try {
      const concepts = JSON.parse(localStorage.getItem('jos-concepts') || '[]')
      const decayed = concepts.filter(c => {
        if (!c.lastReviewed || (c.strength || 0) < 20) return false
        return (Date.now() - new Date(c.lastReviewed).getTime()) / 86400000 > 7 && (c.strength || 0) >= 40
      })
      if (decayed.length > 0) {
        const worst = decayed.sort((a, b) => (b.strength || 0) - (a.strength || 0))[0]
        findings.push({ type: 'decay', text: `${worst.name} decayed to ${worst.strength}% — was higher last week` })
      }
    } catch { /* ok */ }

    try {
      const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
      const thisWeek = feelings.filter(f => (Date.now() - new Date(f.date || f.timestamp).getTime()) / 86400000 <= 7)
      if (thisWeek.length >= 5) {
        findings.push({ type: 'consistency', text: `Week consistency: ${thisWeek.length}/7 days active — your strongest pattern` })
      }
    } catch { /* ok */ }

    const needsCompression = Object.keys(localStorage)
      .filter(k => k.startsWith('jos-msgs-'))
      .filter(k => { try { return JSON.parse(localStorage.getItem(k) || '[]').length >= 50 } catch { return false } })
    if (needsCompression.length > 0) {
      findings.push({ type: 'maintenance', text: `${needsCompression.length} conversation histories ready for compression` })
    }

    if (findings.length === 0) return null

    const memo = {
      findings: findings.slice(0, 4),
      processedAt: new Date(now - 3600000 * 3).toISOString(),
      dataPointsProcessed,
      gapHours: Math.round(gap),
    }

    localStorage.setItem('jos-overnight-memo', JSON.stringify(memo))
    return memo
  } catch (e) { console.error('[Overnight]', e); return null }
}

function countDataPoints() {
  let count = 0
  try {
    count += JSON.parse(localStorage.getItem('jos-feelings') || '[]').length * 14
    count += JSON.parse(localStorage.getItem('jos-api-logs') || '[]').length
    count += JSON.parse(localStorage.getItem('jos-concepts') || '[]').length
    Object.keys(localStorage).filter(k => k.startsWith('jos-msgs-')).forEach(k => {
      try { count += JSON.parse(localStorage.getItem(k) || '[]').length } catch { /* ok */ }
    })
  } catch { /* ok */ }
  return count
}
