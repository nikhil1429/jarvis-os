// useTranscriptProcessor.js — Post-session intelligence extraction
// WHY: After Gemini voice session ends, Claude Sonnet processes the full transcript
// and extracts structured intelligence into ALL JARVIS data stores.
// Uses shadow results from transcriptShadow.js to make this near-instant.

import { useState, useCallback } from 'react'
import { logAPICall } from '../utils/apiLogger.js'
import { getShadowResults, resetShadowState } from '../utils/transcriptShadow.js'

const EXTRACTION_PROMPT = `You are the JARVIS OS intelligence processor. You receive a voice conversation transcript between Nikhil (Sir) and JARVIS (Gemini voice). Extract ALL useful information.

You also receive pre-processed shadow data from during the session. Use it to enhance accuracy but re-analyze from the full transcript for completeness.

Respond ONLY in valid JSON. No markdown backticks. No preamble. Omit any key where NOTHING relevant was found:

{
  "feelings": { "confidence": <1-5|null>, "focus": <1-5|null>, "motivation": <1-5|null>, "mood": "<word|null>", "energy": <1-5|null>, "sleep": <1-5|null>, "meds": <bool|null>, "learned": "<string|null>", "struggled": "<string|null>", "journal": "<key insight summary>" },
  "concepts": [{ "name": "<EXACT concept name>", "discussed": true, "sentiment": "<confident|confused|learning|struggling>", "strengthDelta": <-10 to +10>, "note": "<what was said>" }],
  "knowledge": [{ "text": "<insight worth remembering>", "tags": ["<tags>"], "linkedConcepts": ["<names>"] }],
  "decisions": [{ "decision": "<what>", "reasoning": "<why>", "context": "<what prompted>" }],
  "commitments": [{ "text": "<committed to>", "deadline": "<ISO date|null>" }],
  "tasks": { "completed": ["<task IDs mentioned as done>"], "new": ["<new tasks mentioned>"] },
  "mood_signals": { "overall_tone": "<energized|neutral|tired|frustrated|excited|anxious>", "impostor_signals": <bool>, "burnout_signals": <bool>, "confidence_trend": "<up|stable|down>", "notable_quote": "<most revealing thing said>" },
  "jarvis_quality": { "gemini_broke_character": <bool>, "depth_failures": ["<shallow topics>"], "suggested_training_modes": ["<modes>"] }
}

RULES: Extract IMPLICIT signals. "thak gaya"=tired. "ye samajh nahi aa raha"=struggling (strengthDelta -3 to -5). "finally samajh aaya"=confident (+3 to +5). Hinglish understood. Conservative strengthDelta. Only exact concept names. Fewer high-quality over many low-quality.`

export default function useTranscriptProcessor() {
  const [isProcessing, setIsProcessing] = useState(false)

  const processTranscript = useCallback(async () => {
    try {
      const transcript = JSON.parse(localStorage.getItem('jos-gemini-transcript') || '[]')
      if (transcript.length < 3) return

      setIsProcessing(true)
      const shadowResults = getShadowResults()

      const formatted = transcript.map(m => `${m.role === 'user' ? 'Nikhil' : 'JARVIS'}: ${m.text}`).join('\n')
      const startTime = Date.now()

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          stream: false,
          system: EXTRACTION_PROMPT,
          messages: [{ role: 'user', content: `VOICE SESSION TRANSCRIPT:\n${formatted}\n\nSHADOW PRE-ANALYSIS:\n${JSON.stringify(shadowResults)}\n\nExtract all intelligence.` }]
        })
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)
      const data = await response.json()

      // Robust JSON extraction with 3-step fallback
      let parsed
      const rawText = (data.content || []).map(c => c.text || '').join('')
      try {
        parsed = JSON.parse(rawText.trim())
      } catch {
        try {
          parsed = JSON.parse(rawText.replace(/```json\n?|```\n?/g, '').trim())
        } catch {
          try {
            const firstBrace = rawText.indexOf('{')
            const lastBrace = rawText.lastIndexOf('}')
            if (firstBrace !== -1 && lastBrace > firstBrace) {
              parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1))
            } else { throw new Error('No JSON object found') }
          } catch (finalErr) {
            console.error('[TranscriptProcessor] All JSON parse attempts failed:', finalErr)
            try { const queue = JSON.parse(localStorage.getItem('jos-queue') || '[]'); queue.push({ type: 'transcript-parse-error', raw: rawText, timestamp: new Date().toISOString() }); localStorage.setItem('jos-queue', JSON.stringify(queue.slice(-20))) } catch { /* full */ }
            setIsProcessing(false)
            return
          }
        }
      }

      // === UPDATE ALL STORES ===
      updateFeelings(parsed)
      updateConcepts(parsed)
      updateKnowledge(parsed)
      updateDecisions(parsed)
      updateCommitments(parsed)
      updateTasks(parsed)
      updateMoodSignals(parsed)
      updateGeminiMeta(parsed, transcript.length)

      logAPICall({
        model: 'claude-sonnet', mode: 'transcript-processor',
        inputTokens: data.usage?.input_tokens || 0, outputTokens: data.usage?.output_tokens || 0,
        latencyMs: Date.now() - startTime,
        estimatedCost: ((data.usage?.input_tokens || 0) * 0.003 + (data.usage?.output_tokens || 0) * 0.015) / 1000,
        reason: `Gemini transcript: ${transcript.length} entries`,
      })

      resetShadowState()
      setIsProcessing(false)
      window.dispatchEvent(new CustomEvent('jarvis-toast', { detail: { message: 'Intelligence updated from voice session', type: 'success', duration: 3000 } }))
      console.log('[TranscriptProcessor] Complete — all stores updated')

    } catch (err) {
      console.error('[TranscriptProcessor] Failed:', err)
      try { const queue = JSON.parse(localStorage.getItem('jos-queue') || '[]'); queue.push({ type: 'transcript-process', timestamp: new Date().toISOString() }); localStorage.setItem('jos-queue', JSON.stringify(queue)) } catch { /* full */ }
      setIsProcessing(false)
      window.dispatchEvent(new CustomEvent('jarvis-toast', { detail: { message: 'Voice processing queued — will retry', type: 'warning', duration: 3000 } }))
    }
  }, [])

  return { processTranscript, isProcessing }
}

// ============================================================
// STORE UPDATE FUNCTIONS
// ============================================================

function updateFeelings(parsed) {
  if (!parsed.feelings) return
  try {
    const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
    const today = new Date().toISOString().slice(0, 10)
    const todayEntry = feelings.find(f => f.date?.startsWith(today))
    if (todayEntry) {
      for (const [key, val] of Object.entries(parsed.feelings)) {
        if (val !== null && val !== undefined && (todayEntry[key] === null || todayEntry[key] === undefined)) {
          todayEntry[key] = val
        }
      }
      todayEntry.voiceEnriched = true
    } else {
      feelings.push({ date: new Date().toISOString(), ...parsed.feelings, source: 'gemini-voice' })
    }
    localStorage.setItem('jos-feelings', JSON.stringify(feelings))
  } catch { /* ok */ }
}

function updateConcepts(parsed) {
  if (!parsed.concepts?.length) return
  try {
    const concepts = JSON.parse(localStorage.getItem('jos-concepts') || '[]')
    for (const ext of parsed.concepts) {
      const match = concepts.find(c => c.name?.toLowerCase().includes(ext.name?.toLowerCase()) || ext.name?.toLowerCase().includes(c.name?.toLowerCase()))
      if (match) {
        match.strength = Math.min(100, Math.max(0, (match.strength || 0) + (ext.strengthDelta || 0)))
        match.lastReviewed = new Date().toISOString()
        if (!match.notes) match.notes = ''
        match.notes += `\n[Voice ${new Date().toISOString().slice(0,10)}] ${ext.note || ext.sentiment}`
        match.notes = match.notes.slice(-1000)
      }
    }
    localStorage.setItem('jos-concepts', JSON.stringify(concepts))
  } catch { /* ok */ }
}

function updateKnowledge(parsed) {
  if (!parsed.knowledge?.length) return
  try {
    const knowledge = JSON.parse(localStorage.getItem('jos-knowledge') || '[]')
    for (const k of parsed.knowledge) {
      knowledge.push({ timestamp: new Date().toISOString(), text: k.text, tags: k.tags || [], linkedConcepts: k.linkedConcepts || [], source: 'gemini-voice' })
    }
    localStorage.setItem('jos-knowledge', JSON.stringify(knowledge.slice(-500)))
  } catch { /* ok */ }
}

function updateDecisions(parsed) {
  if (!parsed.decisions?.length) return
  try {
    const decisions = JSON.parse(localStorage.getItem('jos-decisions') || '[]')
    const today = new Date().toISOString().slice(0, 10)
    for (const d of parsed.decisions) {
      const isDuplicate = decisions.some(existing => existing.decision?.toLowerCase() === d.decision?.toLowerCase() && existing.date?.slice(0,10) === today)
      if (!isDuplicate) {
        decisions.push({ date: new Date().toISOString(), decision: d.decision, reasoning: d.reasoning || '', context: d.context || '', source: 'gemini-voice-postprocess' })
      }
    }
    localStorage.setItem('jos-decisions', JSON.stringify(decisions.slice(-100)))
  } catch { /* ok */ }
}

function updateCommitments(parsed) {
  if (!parsed.commitments?.length) return
  try {
    const commitments = JSON.parse(localStorage.getItem('jos-commitments') || '[]')
    for (const c of parsed.commitments) {
      commitments.push({ text: c.text, deadline: c.deadline || null, progress: 0, completedAt: null, source: 'gemini-voice', createdAt: new Date().toISOString() })
    }
    localStorage.setItem('jos-commitments', JSON.stringify(commitments))
  } catch { /* ok */ }
}

function updateTasks(parsed) {
  if (parsed.tasks?.completed?.length) {
    try {
      const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
      const done = core.completedTasks || []
      for (const t of parsed.tasks.completed) { const id = parseInt(t); if (!isNaN(id) && !done.includes(id)) done.push(id) }
      core.completedTasks = done
      localStorage.setItem('jos-core', JSON.stringify(core))
      window.dispatchEvent(new CustomEvent('jarvis-task-toggled'))
    } catch { /* ok */ }
  }
  if (parsed.tasks?.new?.length) {
    try {
      const commitments = JSON.parse(localStorage.getItem('jos-commitments') || '[]')
      for (const t of parsed.tasks.new) { commitments.push({ text: t, progress: 0, completedAt: null, source: 'gemini-voice-task', createdAt: new Date().toISOString() }) }
      localStorage.setItem('jos-commitments', JSON.stringify(commitments))
    } catch { /* ok */ }
  }
}

function updateMoodSignals(parsed) {
  if (!parsed.mood_signals) return
  try {
    const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
    const today = new Date().toISOString().slice(0, 10)
    const todayEntry = feelings.find(f => f.date?.startsWith(today))
    if (todayEntry) {
      todayEntry.voiceTone = parsed.mood_signals.overall_tone
      todayEntry.impostorSignals = parsed.mood_signals.impostor_signals
      todayEntry.burnoutSignals = parsed.mood_signals.burnout_signals
      todayEntry.confidenceTrend = parsed.mood_signals.confidence_trend
      if (parsed.mood_signals.notable_quote) todayEntry.notableQuote = parsed.mood_signals.notable_quote
      localStorage.setItem('jos-feelings', JSON.stringify(feelings))
    }
  } catch { /* ok */ }
}

function updateGeminiMeta(parsed, transcriptLength) {
  try {
    const meta = JSON.parse(localStorage.getItem('jos-gemini-meta') || '[]')
    meta.push({
      sessionDate: new Date().toISOString(),
      characterBreaks: parsed.jarvis_quality?.gemini_broke_character || false,
      depthFailures: parsed.jarvis_quality?.depth_failures || [],
      suggestedModes: parsed.jarvis_quality?.suggested_training_modes || [],
      transcriptLength,
      overallTone: parsed.mood_signals?.overall_tone || 'unknown',
      extractedItems: {
        feelings: !!parsed.feelings, concepts: parsed.concepts?.length || 0,
        knowledge: parsed.knowledge?.length || 0, decisions: parsed.decisions?.length || 0,
        commitments: parsed.commitments?.length || 0
      }
    })
    localStorage.setItem('jos-gemini-meta', JSON.stringify(meta.slice(-50)))
  } catch { /* ok */ }
}
