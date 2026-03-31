// useAI.js — Anthropic API integration with SSE streaming
// WHY: This hook handles ALL AI communication. It builds the system prompt,
// routes to the right model, streams the response for typewriter effect,
// and logs every call. Components just call sendMessage(text) and get
// streaming updates via the returned state.
//
// Flow: user message → buildSystemPrompt() → getModel() → fetch SSE →
// stream chunks → logAPICall() → return complete response

import { useState, useCallback, useRef } from 'react'
import useStorage from './useStorage.js'
import { getModel } from '../utils/modelRouter.js'
import { buildSystemPrompt } from '../data/prompts.js'
import { logAPICall } from '../utils/apiLogger.js'
import { getDayNumber, getWeekNumber } from '../utils/dateUtils.js'
import { compileSummary } from '../utils/strategicCompiler.js'

// WHY: Cross-mode memory maps define which modes feed context to each other.
// Quiz needs Presser struggles, Presser needs Quiz scores, etc.
// This prevents knowledge silos — JARVIS remembers across training modes.
const CROSS_MODE_MAP = {
  quiz: ['presser', 'teach'],
  presser: ['quiz', 'battle'],
  'interview-sim': ['quiz', 'presser', 'recruiter-ghost'],
  battle: ['teach', 'quiz'],
  teach: ['quiz', 'battle'],
  'code-autopsy': ['quiz', 'forensics'],
  'scenario-bomb': ['code-autopsy', 'battle'],
  'alter-ego': ['impostor-killer', 'quiz'],
  'recruiter-ghost': ['interview-sim', 'presser'],
}

export default function useAI() {
  const { get, update } = useStorage()
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  /**
   * sendMessage — Sends a message and streams the response
   * @param {string} userMessage — The user's message text
   * @param {string} mode — Current training mode (e.g., 'chat', 'quiz')
   * @param {Object} options — Additional context for routing/prompts
   * @returns {Promise<{ text: string, model: string, tier: number, autoUpgraded: boolean, reason: string }>}
   */
  const sendMessage = useCallback(async (userMessage, mode, options = {}) => {
    setIsStreaming(true)
    setStreamingText('')
    setError(null)

    const startTime = Date.now()

    try {
      // Build context for model routing
      const core = get('core') || {}
      const weekNumber = getWeekNumber(core.startDate)
      const dayNumber = getDayNumber(core.startDate)

      const routingContext = {
        weekNumber,
        dayOfWeek: new Date().getDay(),
        userIntent: userMessage,
        activeConcept: options.activeConcept || null,
        lastQuizScore: options.lastQuizScore || null,
        streakRecovery: core.streak === 1 && core.previousStreak > 1,
        interviewWithin24h: options.interviewWithin24h || false,
      }

      // Route to correct model
      const routing = getModel(mode, routingContext)

      // Build system prompt
      let systemPrompt = buildSystemPrompt(mode, {
        weekNumber,
        rank: core.rank || 'Recruit',
        streak: core.streak || 0,
        dayNumber,
        energy: core.energy || 3,
      })

      // Inject cross-mode memory (last 3 messages from related modes)
      const relatedModes = CROSS_MODE_MAP[mode]
      if (relatedModes) {
        const crossModeLines = []
        relatedModes.forEach(relMode => {
          const relMsgs = get(`msgs-${relMode}`) || []
          const recent = relMsgs.slice(-3)
          if (recent.length > 0) {
            const summaries = recent.map(m =>
              `[${m.role}]: ${m.content.slice(0, 100)}${m.content.length > 100 ? '...' : ''}`
            )
            crossModeLines.push(`From ${relMode}: ${summaries.join(' | ')}`)
          }
        })
        if (crossModeLines.length > 0) {
          systemPrompt += `\n\nCROSS-MODE CONTEXT:\n${crossModeLines.join('\n')}`
        }
      }

      // For Opus calls, inject strategic intelligence summary
      if (routing.tier >= 2) {
        try {
          const summary = compileSummary()
          systemPrompt += `\n\nSTRATEGIC INTELLIGENCE:\n${summary}`
        } catch (err) {
          console.warn('[useAI] Strategic compiler failed:', err)
        }
      }

      // Load conversation history for this mode (last 50 messages)
      const msgKey = `msgs-${mode}`
      const history = get(msgKey) || []
      const recentHistory = history.slice(-50)

      // Build messages array for the API
      const messages = [
        ...recentHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ]

      // Save user message to history
      update(msgKey, prev => {
        const existing = prev || []
        const updated = [...existing, {
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString(),
          wordCount: userMessage.split(/\s+/).length,
        }]
        // Cap at 50 messages per mode
        return updated.slice(-50)
      })

      // Create abort controller for this request
      const abortController = new AbortController()
      abortRef.current = abortController

      // Make the API call with streaming
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: routing.model,
          max_tokens: 2048,
          system: systemPrompt,
          messages,
          stream: true,
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        const errBody = await response.text()
        throw new Error(`API error ${response.status}: ${errBody}`)
      }

      // Parse SSE stream
      // WHY buffer: SSE chunks from reader.read() can split mid-line.
      // We accumulate a buffer and only process complete lines (ending with \n).
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let inputTokens = 0
      let outputTokens = 0
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()
          if (!data || data === '[DONE]') continue

          try {
            const event = JSON.parse(data)

            if (event.type === 'content_block_delta' && event.delta?.text) {
              fullText += event.delta.text
              setStreamingText(fullText)
            }

            if (event.type === 'message_start' && event.message?.usage) {
              inputTokens = event.message.usage.input_tokens || 0
            }

            if (event.type === 'message_delta' && event.usage) {
              outputTokens = event.usage.output_tokens || 0
            }
          } catch {
            // Skip unparseable lines (keepalive pings, etc.)
          }
        }
      }

      const latencyMs = Date.now() - startTime

      // Save assistant message to history
      update(msgKey, prev => {
        const existing = prev || []
        return [...existing, {
          role: 'assistant',
          content: fullText,
          timestamp: new Date().toISOString(),
          wordCount: fullText.split(/\s+/).length,
          model: routing.model,
          tier: routing.tier,
        }].slice(-50)
      })

      // Log the API call
      logAPICall({
        model: routing.model,
        mode,
        inputTokens,
        outputTokens,
        latencyMs,
        promptVersion: 'v1',
        autoUpgraded: routing.autoUpgraded,
        reason: routing.reason,
      })

      setIsStreaming(false)
      return {
        text: fullText,
        model: routing.model,
        tier: routing.tier,
        autoUpgraded: routing.autoUpgraded,
        reason: routing.reason,
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setIsStreaming(false)
        return null
      }
      console.error('[useAI] Error:', err)
      setError(err.message)
      setIsStreaming(false)
      throw err
    }
  }, [get, update])

  const abort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setIsStreaming(false)
  }, [])

  return { sendMessage, isStreaming, streamingText, error, abort }
}
