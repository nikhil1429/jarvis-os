// transcriptShadow.js — Background processing DURING Gemini voice sessions
// WHY: Pre-processes transcript every 5 min so post-session extraction is near-instant.
// Uses Claude Sonnet (~$0.01 per call) via existing /api/claude proxy.

import { logAPICall } from './apiLogger.js'

let intervalId = null
let lastProcessedIndex = 0
let accumulatedResults = {
  overall_tone: 'neutral',
  topics_discussed: [],
  concepts_mentioned: [],
  mood_signals: { confidence_trend: 'stable', burnout_signals: false, impostor_signals: false },
  key_quotes: []
}

const SHADOW_SYSTEM_PROMPT = `You are an intelligence extraction system. Extract ONLY these from this partial voice transcript:
1. overall_tone: energized|neutral|tired|frustrated|excited|anxious
2. topics_discussed: [short list of topics mentioned]
3. concepts_mentioned: [AI/tech concept names if any — match against: Prompt Engineering, Token Economics, LLM Architecture Basics, RAG, Fine-Tuning vs Prompting, API Design Patterns, Cost Optimization, Evaluation Metrics, Context Windows, Streaming & SSE, Model Selection Strategy, Hallucination Mitigation, Vector Databases, Embedding Models, Agent Architectures, Tool Use & Function Calling, Guardrails & Safety, Multi-Modal AI, Caching Strategies, Rate Limiting & Throttling, Batch Processing, Error Handling in AI Systems, MCP, Structured Outputs, LLM-as-Judge]
4. mood_signals: { confidence_trend: up|stable|down, burnout_signals: boolean, impostor_signals: boolean }
5. key_quotes: [up to 3 notable things Nikhil said, verbatim, short]
Respond ONLY in valid JSON. No markdown. No backticks. No preamble.`

async function processShadow(getTranscript) {
  try {
    const transcript = getTranscript()
    if (!transcript || transcript.length <= lastProcessedIndex) return

    const newMessages = transcript.slice(lastProcessedIndex)
    lastProcessedIndex = transcript.length

    // Check character count, not message count — short messages = no substance
    const transcriptText = newMessages.map(m => m.text || '').join(' ')
    if (transcriptText.length < 150) return

    const formatted = newMessages.map(m =>
      `${m.role === 'user' ? 'Nikhil' : 'JARVIS'}: ${m.text}`
    ).join('\n')

    const startTime = Date.now()

    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        stream: false,
        system: SHADOW_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `PARTIAL TRANSCRIPT:\n${formatted}` }]
      })
    })

    if (!response.ok) { console.warn('[Shadow] API call failed:', response.status); return }

    const data = await response.json()
    const text = (data.content || []).map(c => c.text || '').join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // Merge incrementally
    if (parsed.overall_tone) accumulatedResults.overall_tone = parsed.overall_tone
    if (parsed.topics_discussed) {
      const existing = new Set(accumulatedResults.topics_discussed)
      parsed.topics_discussed.forEach(t => existing.add(t))
      accumulatedResults.topics_discussed = [...existing]
    }
    if (parsed.concepts_mentioned) {
      const existing = new Set(accumulatedResults.concepts_mentioned)
      parsed.concepts_mentioned.forEach(c => existing.add(c))
      accumulatedResults.concepts_mentioned = [...existing]
    }
    if (parsed.mood_signals) {
      accumulatedResults.mood_signals = { ...accumulatedResults.mood_signals, ...parsed.mood_signals }
    }
    if (parsed.key_quotes) {
      accumulatedResults.key_quotes = [...accumulatedResults.key_quotes, ...parsed.key_quotes].slice(-5)
    }

    logAPICall({
      model: 'claude-sonnet',
      mode: 'shadow-processor',
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
      latencyMs: Date.now() - startTime,
      estimatedCost: ((data.usage?.input_tokens || 0) * 0.003 + (data.usage?.output_tokens || 0) * 0.015) / 1000,
      reason: `Shadow: ${newMessages.length} new messages`,
    })

    console.log('[Shadow] Processed', newMessages.length, 'new messages')
  } catch (err) {
    console.warn('[Shadow] Processing error:', err)
  }
}

export function startShadowProcessing(getTranscript) {
  lastProcessedIndex = 0
  accumulatedResults = {
    overall_tone: 'neutral', topics_discussed: [], concepts_mentioned: [],
    mood_signals: { confidence_trend: 'stable', burnout_signals: false, impostor_signals: false },
    key_quotes: []
  }
  intervalId = setInterval(() => processShadow(getTranscript), 5 * 60 * 1000)
  console.log('[Shadow] Processing started — every 5 minutes')
}

export function stopShadowProcessing() {
  if (intervalId) { clearInterval(intervalId); intervalId = null }
  console.log('[Shadow] Processing stopped')
}

export function getShadowResults() {
  return { ...accumulatedResults }
}

export function resetShadowState() {
  lastProcessedIndex = 0
  accumulatedResults = {
    overall_tone: 'neutral', topics_discussed: [], concepts_mentioned: [],
    mood_signals: { confidence_trend: 'stable', burnout_signals: false, impostor_signals: false },
    key_quotes: []
  }
}
