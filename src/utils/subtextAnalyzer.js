// subtextAnalyzer.js — Claude analyzes Hinglish emotional subtext
// Replaces keyword-based emotion detection. Nikhil has ADHD-PI, processes emotions indirectly.

import { recordEmotionalMoment } from './relationshipEngine.js'
import { saveConcern, savePromise } from './emotionalMemory.js'

export async function analyzeSubtext(message, context, sendMessageFn) {
  if (!message || message.length < 15) return null

  const prompt = `You are analyzing a message from Nikhil to his AI companion JARVIS.
Nikhil has ADHD-PI, speaks Hinglish (Hindi+English mix), processes emotions INDIRECTLY.
"Dekhte hain" might mean avoidance. "Sab theek hai" after a bad day might be deflection.

Message: "${message}"
Context: ${context.timeOfDay || 'unknown'} time, ${context.inputMode || 'typed'}, mood trend: ${context.moodTrend || 'unknown'}

Return ONLY valid JSON:
{
  "surface": "what he literally said",
  "subtext": "what he actually means",
  "emotionalState": "specific feeling",
  "vulnerability": 0-10,
  "honesty": 0-10,
  "distressLevel": 0-10,
  "concerns": ["worries mentioned or implied"],
  "promises": ["commitments like 'kal karunga'"]
}
Only include fields you can genuinely infer. Use null for uncertain.`

  try {
    const result = await sendMessageFn(prompt, 'chat', {})
    if (!result?.text) return null

    const cleaned = result.text.replace(/```json|```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const analysis = JSON.parse(jsonMatch[0])

    if ((analysis.vulnerability || 0) >= 5 || (analysis.distressLevel || 0) >= 5) {
      const dimChanges = {}
      if (analysis.vulnerability >= 5) dimChanges.trust = analysis.vulnerability * 0.3
      if (analysis.honesty >= 7) dimChanges.honesty = analysis.honesty * 0.2
      dimChanges.depth = 0.5

      recordEmotionalMoment({
        type: (analysis.distressLevel || 0) >= 7 ? 'distress' : 'vulnerable',
        text: analysis.subtext || analysis.surface || message.slice(0, 80),
        weight: (analysis.vulnerability || 0) >= 7 || (analysis.distressLevel || 0) >= 7 ? 'HIGH' : 'MEDIUM',
        dimensionChanges: dimChanges,
        context: { originalMessage: message.slice(0, 100), time: new Date().toISOString() },
      })
    }

    if (analysis.concerns?.length) analysis.concerns.forEach(c => saveConcern(c))
    if (analysis.promises?.length) analysis.promises.forEach(p => savePromise(p))

    if (context.inputMode === 'voice') {
      recordEmotionalMoment({ type: 'intimacy-signal', text: 'Used voice input', weight: 'LOW', dimensionChanges: { intimacy: 0.2 } })
    }

    return analysis
  } catch (e) {
    console.error('[SubtextAnalyzer]', e)
    return null
  }
}

export function shouldAnalyze(message, mode) {
  if (!message) return false
  if (mode === 'voice-debrief') return true
  if (message.length > 50) return true
  if (['chat', 'impostor-killer', 'alter-ego'].includes(mode)) return true
  return false
}
