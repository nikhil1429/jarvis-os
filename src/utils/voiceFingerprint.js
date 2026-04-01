// voiceFingerprint.js — Basic speaker recognition using Web Audio API
// ~75% accuracy for obvious differences. No external APIs, no cost.

const STORAGE_KEY = 'jos-voice-print'

export function extractFeatures(analyser) {
  const n = analyser.frequencyBinCount
  const freq = new Uint8Array(n)
  const time = new Uint8Array(n)
  analyser.getByteFrequencyData(freq)
  analyser.getByteTimeDomainData(time)

  let wSum = 0, total = 0
  for (let i = 0; i < n; i++) { wSum += i * freq[i]; total += freq[i] }
  const spectralCentroid = total > 0 ? wSum / total : 0

  let maxE = 0, domBand = 0
  const bs = Math.floor(n / 8)
  for (let b = 0; b < 8; b++) {
    let e = 0; for (let i = b * bs; i < (b + 1) * bs; i++) e += freq[i]
    if (e > maxE) { maxE = e; domBand = b }
  }

  let zc = 0
  for (let i = 1; i < n; i++) if ((time[i-1] < 128) !== (time[i] < 128)) zc++

  let geoSum = 0, ariSum = 0, nz = 0
  for (let i = 0; i < n; i++) if (freq[i] > 0) { geoSum += Math.log(freq[i]); ariSum += freq[i]; nz++ }
  const flatness = nz > 0 ? Math.exp(geoSum / nz) / (ariSum / nz) : 0

  return { spectralCentroid, dominantBand: domBand, avgEnergy: total / n, zeroCrossings: zc, spectralFlatness: flatness }
}

export function createVoicePrint(samples) {
  if (samples.length < 10) return null
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
  const std = (arr) => { const m = avg(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length) }
  const keys = ['spectralCentroid', 'dominantBand', 'avgEnergy', 'zeroCrossings', 'spectralFlatness']
  const print = { sampleCount: samples.length, createdAt: new Date().toISOString(), version: 1 }
  keys.forEach(k => { print[k] = { mean: avg(samples.map(s => s[k])), std: std(samples.map(s => s[k])) } })
  return print
}

export function verifyVoice(current, stored) {
  if (!stored || !current) return { match: true, confidence: 0 }
  const feats = ['spectralCentroid', 'dominantBand', 'zeroCrossings', 'spectralFlatness']
  let totalDev = 0
  feats.forEach(f => {
    const s = stored[f]; if (!s || s.std === 0) return
    totalDev += Math.abs(current[f] - s.mean) / Math.max(s.std, 0.001)
  })
  const avgDev = totalDev / feats.length
  const confidence = Math.max(0, Math.min(100, Math.round(100 - avgDev * 25)))
  return { match: confidence >= 50, confidence }
}

export function saveVoicePrint(print) { localStorage.setItem(STORAGE_KEY, JSON.stringify(print)) }
export function loadVoicePrint() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null } }
export function isEnrolled() { return !!loadVoicePrint() }

// E1: Mood detection from voice characteristics
export function detectMood(samples) {
  if (samples.length < 5) return { mood: 'neutral', confidence: 0 }
  const recent = samples.slice(-10)
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
  const avgPitch = avg(recent.map(f => f.zeroCrossings))
  const pitchVar = avg(recent.map(f => Math.abs(f.zeroCrossings - avgPitch)))
  const avgE = avg(recent.map(f => f.avgEnergy))
  const rate = recent.filter(f => f.avgEnergy > 5).length / recent.length

  if (avgE > 40 && rate > 0.7 && avgPitch > 30) return { mood: 'stressed', confidence: Math.min(75, 55 + avgE - 40) }
  if (avgE > 35 && pitchVar > 8 && rate > 0.6) return { mood: 'excited', confidence: Math.min(75, 50 + pitchVar) }
  if (avgE < 15 && rate < 0.4 && avgPitch < 20) return { mood: 'tired', confidence: Math.min(75, 50 + 25 - avgE) }
  if (avgE > 10 && avgE < 35 && pitchVar < 5) return { mood: 'focused', confidence: 55 }
  return { mood: 'neutral', confidence: 40 }
}

// E2: Voice vitals — compare current session against baseline
export function checkVoiceVitals(currentFeatures, storedPrint) {
  if (!storedPrint || !currentFeatures || currentFeatures.length < 10) return { status: 'insufficient-data', deviations: {} }
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
  const cur = { energy: avg(currentFeatures.map(f => f.avgEnergy)), pitch: avg(currentFeatures.map(f => f.zeroCrossings)) }
  const base = { energy: storedPrint.avgEnergy?.mean || 25, pitch: storedPrint.zeroCrossings?.mean || 25 }
  const dev = { energy: ((cur.energy - base.energy) / Math.max(base.energy, 1)) * 100, pitch: ((cur.pitch - base.pitch) / Math.max(base.pitch, 1)) * 100 }
  let status = 'normal'
  if (dev.energy < -20 && dev.pitch < -10) status = 'fatigue-likely'
  else if (dev.energy > 30 && dev.pitch > 15) status = 'elevated'
  return { status, deviations: dev }
}

// E3: Multi-speaker
const SPEAKERS_KEY = 'jos-voice-speakers'
export function enrollSpeaker(name, print) {
  const sp = JSON.parse(localStorage.getItem(SPEAKERS_KEY) || '{}')
  sp[name] = { ...print, enrolledAt: new Date().toISOString() }
  localStorage.setItem(SPEAKERS_KEY, JSON.stringify(sp))
}
export function identifySpeaker(currentFeatures) {
  const sp = JSON.parse(localStorage.getItem(SPEAKERS_KEY) || '{}')
  const primary = loadVoicePrint()
  let best = { name: 'unknown', confidence: 0 }
  if (primary) { const r = verifyVoice(currentFeatures, primary); if (r.confidence > best.confidence) best = { name: 'Sir', confidence: r.confidence } }
  for (const [name, print] of Object.entries(sp)) { const r = verifyVoice(currentFeatures, print); if (r.confidence > best.confidence) best = { name, confidence: r.confidence } }
  return best
}
export function getEnrolledSpeakers() {
  const sp = JSON.parse(localStorage.getItem(SPEAKERS_KEY) || '{}')
  return [...(loadVoicePrint() ? ['Sir'] : []), ...Object.keys(sp)]
}

// E4: Auth levels
export function getAuthLevel(verResult, speaker) {
  if (!verResult?.match || speaker?.name !== 'Sir') return { level: 1, label: 'GUEST', color: '#5a7a94' }
  return { level: 2, label: 'VERIFIED', color: '#10b981' }
}
