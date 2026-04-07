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
import { buildSystemPrompt, getPersonalityModifiers, getMediaAdaptation } from '../data/prompts.js'
import { getTemporalContext } from '../utils/temporalAwareness.js'
import { getConversationContext } from '../utils/conversationMemory.js'
import { getRelationshipPrompt } from '../utils/relationshipEngine.js'
import { getSelfAwarenessPrompt } from '../utils/jarvisInnerLife.js'
import { logAPICall } from '../utils/apiLogger.js'
import { getDayNumber, getWeekNumber } from '../utils/dateUtils.js'
import { compileSummary } from '../utils/strategicCompiler.js'
import { getJarvisBehavior, getSpecialPromptAdditions } from '../utils/jarvisBehavior.js'
import { getPatternPrompt } from '../utils/patternEngine.js'
import { getCommunicationPrompt } from '../utils/communicationTracker.js'
import { getMoodPredictionPrompt } from '../utils/moodEngine.js'
import { getSessionContinuityPrompt } from '../utils/sessionContinuity.js'
import { getProactiveSuggestionPrompt } from '../utils/proactiveEngine.js'
import { getDifficultyPrompt } from '../utils/adaptiveDifficulty.js'
import { getMomentumPrompt } from '../utils/momentumTracker.js'
import { getAvoidancePrompt } from '../utils/avoidanceDetector.js'
import { getSelfLearningPrompt } from '../utils/selfLearning.js'
import CONCEPTS_DATA from '../data/concepts.js'

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

// Tool definitions — JARVIS can take actions
const JARVIS_TOOLS = [
  { name: 'complete_task', description: 'Mark a build task as complete when Sir says he finished it.', input_schema: { type: 'object', properties: { taskId: { type: 'number', description: 'Task ID number' } }, required: ['taskId'] } },
  { name: 'update_concept_strength', description: 'Update mastery strength of an AI concept after assessment.', input_schema: { type: 'object', properties: { conceptName: { type: 'string' }, newStrength: { type: 'number', description: '0-100' }, reason: { type: 'string' } }, required: ['conceptName', 'newStrength'] } },
  { name: 'update_identity', description: 'Save life updates from Sir — job, location, relationships, goals.', input_schema: { type: 'object', properties: { field: { type: 'string', enum: ['career','location','relationships','health','goals','achievements','notes'] }, value: { type: 'string' } }, required: ['field', 'value'] } },
  { name: 'create_quick_capture', description: 'Save a thought or insight to Second Brain.', input_schema: { type: 'object', properties: { text: { type: 'string' }, category: { type: 'string', enum: ['insight','idea','todo','learning','personal'] } }, required: ['text'] } },
  { name: 'get_concept_strength', description: 'Look up current strength of a concept.', input_schema: { type: 'object', properties: { conceptName: { type: 'string' } }, required: ['conceptName'] } },
  { name: 'get_today_stats', description: 'Get live stats — tasks, streak, energy, day number.', input_schema: { type: 'object', properties: {} } },
  { name: 'log_application', description: 'Log a job application.', input_schema: { type: 'object', properties: { company: { type: 'string' }, role: { type: 'string' }, status: { type: 'string', enum: ['applied','screening','interview','rejected','offer'] } }, required: ['company', 'role'] } },
]

function executeToolCall(name, input) {
  if (name === 'complete_task') {
    try {
      const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
      const done = core.completedTasks || []
      if (!done.includes(input.taskId)) { done.push(input.taskId); core.completedTasks = done; localStorage.setItem('jos-core', JSON.stringify(core)); window.dispatchEvent(new CustomEvent('jarvis-task-toggled')) }
      return { success: true, tasksCompleted: done.length }
    } catch (err) { return { error: `complete_task failed: ${err.message}` } }
  }
  if (name === 'update_concept_strength') {
    try {
      let concepts = JSON.parse(localStorage.getItem('jos-concepts') || '[]')
      let c = concepts.find(x => x.name.toLowerCase().includes(input.conceptName.toLowerCase()))
      // If not in localStorage, find in static data and create entry
      if (!c) {
        const staticConcept = CONCEPTS_DATA.find(x => x.name.toLowerCase().includes(input.conceptName.toLowerCase()))
        if (staticConcept) {
          c = { id: staticConcept.id, name: staticConcept.name, strength: 0 }
          concepts.push(c)
        }
      }
      if (c) {
        const old = c.strength
        c.strength = Math.min(100, Math.max(0, input.newStrength))
        c.lastReviewed = new Date().toISOString()
        if (!c.reviewHistory) c.reviewHistory = []
        c.reviewHistory.push({ date: new Date().toISOString(), score: input.newStrength, source: 'tool' })
        localStorage.setItem('jos-concepts', JSON.stringify(concepts))
        return { success: true, old, new: c.strength }
      }
      return { error: 'Concept not found' }
    } catch (err) { return { error: `update_concept failed: ${err.message}` } }
  }
  if (name === 'update_identity') {
    try {
      const id = JSON.parse(localStorage.getItem('jos-identity') || '{}')
      id[input.field] = input.value + ` [${new Date().toISOString().split('T')[0]}]`
      localStorage.setItem('jos-identity', JSON.stringify(id)); return { success: true }
    } catch (err) { return { error: `update_identity failed: ${err.message}` } }
  }
  if (name === 'create_quick_capture') {
    try {
      const caps = JSON.parse(localStorage.getItem('jos-quick-capture') || '[]')
      caps.push({ timestamp: new Date().toISOString(), text: input.text, category: input.category || 'insight', source: 'jarvis-tool' })
      localStorage.setItem('jos-quick-capture', JSON.stringify(caps)); return { success: true }
    } catch (err) { return { error: `quick_capture failed: ${err.message}` } }
  }
  if (name === 'get_concept_strength') {
    try {
      const concepts = JSON.parse(localStorage.getItem('jos-concepts') || '[]')
      let c = concepts.find(x => x.name.toLowerCase().includes(input.conceptName.toLowerCase()))
      if (!c) {
        const sc = CONCEPTS_DATA.find(x => x.name.toLowerCase().includes(input.conceptName.toLowerCase()))
        if (sc) c = { name: sc.name, strength: 0, lastReviewed: null }
      }
      return c ? { name: c.name, strength: c.strength || 0, lastReviewed: c.lastReviewed || null } : { error: 'Not found' }
    } catch (err) { return { error: `get_concept failed: ${err.message}` } }
  }
  if (name === 'get_today_stats') {
    try {
      const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
      return { tasks: (core.completedTasks||[]).length, total: 82, streak: core.streak||0, energy: core.energy||3, rank: core.rank||'Recruit' }
    } catch (err) { return { error: `get_stats failed: ${err.message}` } }
  }
  if (name === 'log_application') {
    try {
      const apps = JSON.parse(localStorage.getItem('jos-applications') || '[]')
      apps.push({ date: new Date().toISOString(), company: input.company, role: input.role, status: input.status || 'applied' })
      localStorage.setItem('jos-applications', JSON.stringify(apps)); return { success: true }
    } catch (err) { return { error: `log_application failed: ${err.message}` } }
  }
  return { error: `Unknown tool: ${name}` }
}

const TOOL_MODES = ['chat', 'body-double', 'quiz', 'impostor-killer', 'alter-ego']

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

      // Inject temporal consciousness + adaptive personality
      const temporal = getTemporalContext()
      const temporalSection = `\nTime: ${temporal.timeLabel}, medication: ${temporal.medState}.${temporal.warnings.length ? ' Warnings: ' + temporal.warnings.join('. ') : ''}${temporal.suggestions.length ? ' Suggestions: ' + temporal.suggestions.join('. ') : ''}`
      systemPrompt += temporalSection

      const modifiers = getPersonalityModifiers()
      if (modifiers.length > 0) {
        systemPrompt += '\n\nPersonality adjustments:\n' + modifiers.map(m => '- ' + m).join('\n')
      }

      // Inject relationship state + self-awareness + communication adaptation
      systemPrompt += '\n\n--- RELATIONSHIP ---\n' + getRelationshipPrompt()
      systemPrompt += '\n\n--- SELF-AWARENESS ---\n' + getSelfAwarenessPrompt()
      systemPrompt += '\n\n--- COMMUNICATION ---\n' + getMediaAdaptation()

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

      // Inject personal context from onboarding interview
      try {
        const onboarding = JSON.parse(localStorage.getItem('jos-onboarding') || 'null')
        if (onboarding && !onboarding.extractionFailed) {
          const ctx = []
          if (onboarding.energy) {
            ctx.push(`Peak energy: ${onboarding.energy.peakHours || 'unknown'}, crashes: ${onboarding.energy.crashHours || 'unknown'}`)
            ctx.push(`Sleep: ${onboarding.energy.sleepHours || '?'}hrs, Caffeine: ${onboarding.energy.caffeinePerDay || '?'}/day`)
          }
          if (onboarding.work) {
            ctx.push(`Work style: ${onboarding.work.style || 'unknown'}, Focus breakers: ${(onboarding.work.focusBreakers || []).join(', ') || 'unknown'}`)
          }
          if (onboarding.adhd) {
            ctx.push(`Medication: ${onboarding.adhd.medicationTime || 'unknown'}, lasts ${onboarding.adhd.medicationDuration || '?'}`)
          }
          if (onboarding.psychology) {
            ctx.push(`Excites: ${(onboarding.psychology.excitements || []).join(', ') || 'unknown'}`)
            ctx.push(`Fears: ${(onboarding.psychology.fears || []).join(', ') || 'unknown'}`)
          }
          if (onboarding.relationships) {
            ctx.push(`Support: ${(onboarding.relationships.supportNetwork || []).join(', ') || 'unknown'}`)
          }
          if (ctx.length > 0) {
            systemPrompt += `\n\nPERSONAL CONTEXT (from onboarding):\n${ctx.join('\n')}\nUse this data to personalize responses. Reference naturally, don't recite.`
          }
        }
      } catch { /* ok — onboarding data optional */ }

      // For Opus calls, inject strategic intelligence summary
      if (routing.tier >= 2) {
        try {
          const summary = compileSummary()
          systemPrompt += `\n\nSTRATEGIC INTELLIGENCE:\n${summary}`
        } catch (err) {
          console.warn('[useAI] Strategic compiler failed:', err)
        }
      }

      // Behavioral engine — MCU-canon reactive personality
      try {
        const behavior = getJarvisBehavior()
        systemPrompt += `\n\n--- BEHAVIORAL ENGINE ---\n${behavior.promptModifier}`
        systemPrompt += `\n\nCURRENT SIGNALS:\n- Energy: ${behavior.signals.energy}/5\n- Streak: ${behavior.signals.streak} days\n- Mood: "${behavior.signals.mood}"\n- Time: ${behavior.signals.hour}:${String(new Date().getMinutes()).padStart(2, '0')}\n- Session: ${behavior.signals.sessionHours} hours\n- Meds: ${behavior.signals.medsWearingOff ? 'wearing off' : 'active'}\n- Sleep: ${behavior.signals.sleep}/5\n- Rank: ${behavior.signals.rank}\n- Week: ${behavior.signals.weekNumber}`

        // Store behavior flags globally
        if (typeof window !== 'undefined') {
          window.__jarvisBehaviorFlags = behavior.behaviorFlags
        }

        // Check user message for special interactions (gratitude, self-doubt, etc.)
        const lastAssistantMsg = (get(`msgs-${mode}`) || []).filter(m => m.role === 'assistant').pop()?.content || ''
        const specialAdditions = getSpecialPromptAdditions(userMessage, lastAssistantMsg)
        if (specialAdditions) systemPrompt += specialAdditions

        console.log('[useAI] Behavior scenario:', behavior.scenario)
      } catch (err) {
        console.warn('[useAI] Behavioral engine failed:', err)
      }

      // Intelligence layer prompts — high priority first, drop low priority if prompt > 8000 chars
      try {
        // High priority (always include)
        const continuityCtx = getSessionContinuityPrompt()
        if (continuityCtx) systemPrompt += '\n\n' + continuityCtx
        const avoidanceCtx = getAvoidancePrompt()
        if (avoidanceCtx) systemPrompt += '\n\n' + avoidanceCtx
        const momentumCtx = getMomentumPrompt()
        if (momentumCtx) systemPrompt += '\n\n' + momentumCtx
        const difficultyCtx = getDifficultyPrompt(mode, options.activeConcept || null)
        if (difficultyCtx) systemPrompt += '\n\n' + difficultyCtx
        // Medium priority (include if under budget)
        if (systemPrompt.length < 8000) {
          const proactiveCtx = getProactiveSuggestionPrompt()
          if (proactiveCtx) systemPrompt += '\n\n' + proactiveCtx
        }
        // Low priority (drop if prompt already large)
        if (systemPrompt.length < 7000) {
          const patternCtx = getPatternPrompt()
          if (patternCtx) systemPrompt += '\n\n' + patternCtx
          const commCtx = getCommunicationPrompt()
          if (commCtx) systemPrompt += '\n\n' + commCtx
          const moodCtx = getMoodPredictionPrompt()
          if (moodCtx) systemPrompt += '\n\n' + moodCtx
          const selfLearnCtx = getSelfLearningPrompt()
          if (selfLearnCtx) systemPrompt += '\n\n' + selfLearnCtx
        }
        console.log('[useAI] System prompt length:', systemPrompt.length, 'chars')
      } catch { /* ok — intelligence prompts optional */ }

      // Load conversation history for this mode (last 50 messages)
      const msgKey = `msgs-${mode}`
      const history = get(msgKey) || []
      const recentHistory = history.slice(-30)

      // Build user content (text or text+image)
      const image = options.image || null
      const userContent = image
        ? [{ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } }, { type: 'text', text: userMessage || 'Analyse this image.' }]
        : userMessage

      // Build messages array for the API (with conversation memory compression)
      const { context: compressedContext } = getConversationContext(mode)
      const messages = []
      if (compressedContext) {
        messages.push({ role: 'user', content: compressedContext })
        messages.push({ role: 'assistant', content: 'Understood, I have the previous context.' })
      }
      messages.push(...recentHistory.map(m => ({ role: m.role, content: m.content })))
      messages.push({ role: 'user', content: userContent })

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
        return updated.slice(-30)
      })

      // Create abort controller for this request
      const abortController = new AbortController()
      abortRef.current = abortController

      // Decide: streaming (fast display) vs non-streaming (tool use support)
      const useTools = TOOL_MODES.includes(mode)
      const requestBody = {
        model: routing.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
        ...(useTools ? { tools: [...JARVIS_TOOLS, { type: 'web_search_20250305', name: 'web_search' }] } : {}),
        stream: !useTools,
      }

      // Non-streaming with tool use
      if (useTools) {
        let resp, data
        for (let attempt = 0; attempt < 3; attempt++) {
          resp = await fetch('/api/claude', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: abortController.signal,
          })
          if (resp.status === 429) {
            const delay = (attempt + 1) * 3000
            await new Promise(r => setTimeout(r, delay))
            if (attempt === 2) throw new Error('Rate limited after 3 retries — please wait a moment')
            continue
          }
          break
        }
        if (!resp.ok) {
          console.error('[useAI] Response:', await resp.text())
          throw new Error(`API error ${resp.status}`)
        }
        data = await resp.json()

        // Handle tool use
        const toolBlocks = (data.content || []).filter(b => b.type === 'tool_use')
        let finalText = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('')

        if (toolBlocks.length > 0) {
          console.log('TOOLS EXECUTED:', toolBlocks.map(b => b.name))
          const toolResults = toolBlocks.map(b => ({
            type: 'tool_result', tool_use_id: b.id,
            content: JSON.stringify(executeToolCall(b.name, b.input)),
          }))
          toolBlocks.forEach(b => window.dispatchEvent(new CustomEvent('jarvis-tool-executed', { detail: { tool: b.name, input: b.input } })))

          // Follow-up with tool results
          const followResp = await fetch('/api/claude', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...requestBody, stream: false, messages: [...messages, { role: 'assistant', content: data.content }, { role: 'user', content: toolResults }] }),
            signal: abortController.signal,
          })
          if (followResp.ok) {
            const followData = await followResp.json()
            finalText = (followData.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
          }
        }

        setStreamingText(finalText)
        const latencyMs = Date.now() - startTime
        update(msgKey, prev => [...(prev || []), { role: 'assistant', content: finalText, timestamp: new Date().toISOString(), model: routing.model, tier: routing.tier }].slice(-30))
        logAPICall({ model: routing.model, mode, inputTokens: data.usage?.input_tokens || 0, outputTokens: data.usage?.output_tokens || 0, latencyMs, autoUpgraded: routing.autoUpgraded, reason: routing.reason })
        setIsStreaming(false)
        return { text: finalText, model: routing.model, tier: routing.tier, autoUpgraded: routing.autoUpgraded, reason: routing.reason }
      }

      // Streaming (no tools) — existing flow
      let response
      for (let attempt = 0; attempt < 3; attempt++) {
        response = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        })
        if (response.status === 429) {
          const delay = (attempt + 1) * 3000
          await new Promise(r => setTimeout(r, delay))
          if (attempt === 2) throw new Error('Rate limited after 3 retries — please wait a moment')
          continue
        }
        break
      }
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
        }].slice(-30)
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
