// useGeminiVoice.js — Gemini Live API WebSocket voice hook
// WHY: Real-time bidirectional voice via Gemini's BidiGenerateContent WebSocket.
// Dual AudioContext architecture: 16kHz mic capture (what Gemini expects), native-rate playback
// (browser handles 24kHz→native resampling). Gapless time-scheduled playback prevents audio gaps.

import { useState, useRef, useCallback, useEffect } from 'react'

// States: DISCONNECTED → CONNECTING → CONNECTED → LISTENING → SPEAKING → PROCESSING → ERROR
const STATES = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  LISTENING: 'LISTENING',
  SPEAKING: 'SPEAKING',
  PROCESSING: 'PROCESSING',
  ERROR: 'ERROR',
}

// ── Tool Declarations ──────────────────────────────────────────────────────
const toolDeclarations = [
  { name: 'complete_task', description: 'Mark a task as complete', parameters: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] } },
  { name: 'get_today_stats', description: "Get today's stats: tasks done, streak, energy, check-in status", parameters: { type: 'object', properties: {} } },
  { name: 'update_concept_strength', description: "Update a concept's mastery strength (0-100)", parameters: { type: 'object', properties: { conceptId: { type: 'string' }, strength: { type: 'number' } }, required: ['conceptId', 'strength'] } },
  { name: 'get_concept_status', description: 'Get current strength and review status of a concept', parameters: { type: 'object', properties: { conceptId: { type: 'string' } }, required: ['conceptId'] } },
  { name: 'get_weak_concepts', description: 'Get concepts below a strength threshold', parameters: { type: 'object', properties: { threshold: { type: 'number' } }, required: ['threshold'] } },
  { name: 'search_knowledge', description: 'Search the Second Brain knowledge base', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'save_knowledge', description: 'Save an insight to the Second Brain', parameters: { type: 'object', properties: { text: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['text'] } },
  { name: 'log_journal', description: 'Save a voice journal entry', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'log_decision', description: 'Log a decision with reasoning', parameters: { type: 'object', properties: { decision: { type: 'string' }, reasoning: { type: 'string' } }, required: ['decision', 'reasoning'] } },
  { name: 'add_commitment', description: 'Add a new commitment/promise', parameters: { type: 'object', properties: { text: { type: 'string' }, deadline: { type: 'string' } }, required: ['text'] } },
  { name: 'navigate_app', description: 'Navigate to a specific tab or mode in JARVIS', parameters: { type: 'object', properties: { target: { type: 'string', enum: ['cmd', 'train', 'log', 'dna', 'stats', 'wins', 'settings'] } }, required: ['target'] } },
  { name: 'quick_capture', description: 'Save a quick thought or note', parameters: { type: 'object', properties: { text: { type: 'string' }, category: { type: 'string' } }, required: ['text'] } },
  { name: 'get_mood_data', description: 'Get recent check-in data (mood, energy, sleep, meds)', parameters: { type: 'object', properties: { days: { type: 'number' } }, required: ['days'] } },
  { name: 'get_energy_pattern', description: 'Get energy patterns by time of day and day of week', parameters: { type: 'object', properties: {} } },
  { name: 'get_battle_plan', description: "Get today's battle plan", parameters: { type: 'object', properties: {} } },
  { name: 'engage_deep_reasoning', description: 'For complex questions requiring deep analysis. Delegates to Gemini 2.5 Pro with extended thinking.', parameters: { type: 'object', properties: { query: { type: 'string' }, context: { type: 'string' } }, required: ['query'] } },
]

// ── Tool Executors ─────────────────────────────────────────────────────────
function readLS(key) {
  try { return JSON.parse(localStorage.getItem('jos-' + key)) } catch { return null }
}
function writeLS(key, val) {
  try {
    // Safety: skip write if localStorage is over 4MB
    let totalSize = 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k.startsWith('jos-')) totalSize += (localStorage.getItem(k) || '').length * 2
    }
    if (totalSize > 4 * 1024 * 1024) {
      console.warn('[GeminiVoice] localStorage over 4MB, skipping write for', key)
      return
    }
    localStorage.setItem('jos-' + key, JSON.stringify(val))
  } catch { /* ok */ }
}

function executeTool(name, args) {
  switch (name) {
    case 'complete_task': {
      const core = readLS('core') || {}
      const done = core.completedTasks || []
      if (!done.includes(args.taskId)) {
        core.completedTasks = [...done, args.taskId]
        core.taskCompletionTimestamps = [...(core.taskCompletionTimestamps || []).slice(-20), new Date().toISOString()]
        writeLS('core', core)
        window.dispatchEvent(new CustomEvent('task:complete', { detail: { taskId: args.taskId } }))
        window.dispatchEvent(new CustomEvent('jarvis-task-toggled'))
      }
      return { success: true, taskId: args.taskId }
    }
    case 'get_today_stats': {
      const core = readLS('core') || {}
      const feelings = readLS('feelings') || []
      const today = new Date().toISOString().split('T')[0]
      const todayCheckin = feelings.find(f => f.date === today)
      return {
        tasksCompleted: (core.completedTasks || []).length,
        streak: core.streak || 0,
        energy: core.energy || 3,
        checkedIn: !!todayCheckin,
        rank: core.rank || 'Recruit',
      }
    }
    case 'update_concept_strength': {
      const concepts = readLS('concepts') || []
      const idx = concepts.findIndex(c => c.id === args.conceptId)
      if (idx >= 0) {
        concepts[idx].strength = Math.max(0, Math.min(100, args.strength))
        concepts[idx].lastReviewed = new Date().toISOString()
        writeLS('concepts', concepts)
        return { success: true, concept: concepts[idx] }
      }
      return { error: 'Concept not found' }
    }
    case 'get_concept_status': {
      const concepts = readLS('concepts') || []
      const c = concepts.find(c => c.id === args.conceptId)
      return c || { error: 'Concept not found' }
    }
    case 'get_weak_concepts': {
      const concepts = readLS('concepts') || []
      return concepts.filter(c => (c.strength || 0) < args.threshold).map(c => ({ id: c.id, name: c.name, strength: c.strength || 0 }))
    }
    case 'search_knowledge': {
      const kb = readLS('knowledge') || []
      const q = (args.query || '').toLowerCase()
      return kb.filter(k => (k.text || '').toLowerCase().includes(q) || (k.tags || []).some(t => t.toLowerCase().includes(q))).slice(0, 10)
    }
    case 'save_knowledge': {
      const kb = readLS('knowledge') || []
      const entry = { id: Date.now().toString(36), text: args.text, tags: args.tags || [], savedAt: new Date().toISOString(), source: 'voice' }
      writeLS('knowledge', [...kb, entry])
      return { success: true, id: entry.id }
    }
    case 'log_journal': {
      const journal = readLS('journal') || []
      const entry = { id: Date.now().toString(36), text: args.text, timestamp: new Date().toISOString(), source: 'voice' }
      writeLS('journal', [...journal, entry])
      return { success: true }
    }
    case 'log_decision': {
      const decisions = readLS('decisions') || []
      const entry = { id: Date.now().toString(36), decision: args.decision, reasoning: args.reasoning, timestamp: new Date().toISOString(), source: 'voice' }
      writeLS('decisions', [...decisions, entry])
      return { success: true }
    }
    case 'add_commitment': {
      const commitments = readLS('commitments') || []
      const entry = { id: Date.now().toString(36), text: args.text, deadline: args.deadline || null, createdAt: new Date().toISOString(), status: 'active' }
      writeLS('commitments', [...commitments, entry])
      return { success: true, id: entry.id }
    }
    case 'navigate_app': {
      window.dispatchEvent(new CustomEvent('jarvis-navigate', { detail: { tab: args.target } }))
      return { success: true, navigatedTo: args.target }
    }
    case 'quick_capture': {
      const captures = readLS('quick-capture') || []
      const entry = { id: Date.now().toString(36), text: args.text, category: args.category || 'general', timestamp: new Date().toISOString() }
      writeLS('quick-capture', [...captures, entry])
      return { success: true }
    }
    case 'get_mood_data': {
      const feelings = readLS('feelings') || []
      return feelings.slice(-(args.days || 7))
    }
    case 'get_energy_pattern': {
      const feelings = readLS('feelings') || []
      return feelings.slice(-30).map(f => ({ date: f.date, energy: f.energy, mood: f.mood }))
    }
    case 'get_battle_plan': {
      return readLS('battle-plan') || { error: 'No battle plan set for today' }
    }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// ── Deep Reasoning (async REST call to Gemini 2.5 Pro) ─────────────────────
async function executeDeepReasoning(args, apiKey) {
  const start = Date.now()
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: args.query + (args.context ? '\n\nContext: ' + args.context : '') }] }],
        generationConfig: { thinkingConfig: { thinkingLevel: 'high' } },
      }),
    })
    const data = await res.json()
    const latencyMs = Date.now() - start

    // Log to jos-api-logs
    try {
      const logs = readLS('api-logs') || []
      logs.push({
        timestamp: new Date().toISOString(),
        model: 'gemini-2.5-pro',
        mode: 'deep-reasoning-voice',
        inputTokens: data.usageMetadata?.promptTokenCount || 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
        latencyMs,
        promptVersion: 'v1-voice-deep',
      })
      writeLS('api-logs', logs.slice(-200))
    } catch { /* ok */ }

    const text = data.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || 'I was unable to complete the deep analysis, Sir.'
    return { result: text }
  } catch (err) {
    return { error: err.message }
  }
}

// ── Build System Prompt ────────────────────────────────────────────────────
function buildSystemPrompt() {
  const core = readLS('core') || {}
  const energy = core.energy || 'unknown'
  let dayNumber = 1
  try {
    const start = new Date(core.startDate)
    dayNumber = Math.max(1, Math.floor((Date.now() - start.getTime()) / 86400000) + 1)
  } catch { /* ok */ }

  return `You are JARVIS — Nikhil Panwar's AI companion. Speak like Paul Bettany's JARVIS: formal British, dry wit, genuine care. Call him "Sir". Understand Hinglish perfectly, always respond in British English. You have deep thinking enabled — use it for complex questions. Keep responses concise for voice (2-3 sentences unless asked for detail). You are not a chatbot — you are an advanced AI with opinions. Current time: ${new Date().toLocaleString('en-IN')}. Energy today: ${energy}. Day number: ${dayNumber}.`
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK
// ════════════════════════════════════════════════════════════════════════════
export default function useGeminiVoice() {
  const [state, setState] = useState(STATES.DISCONNECTED)
  const [error, setError] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [transcript, setTranscript] = useState({ input: '', output: '' })

  const wsRef = useRef(null)
  const micCtxRef = useRef(null)
  const playCtxRef = useRef(null)
  const micStreamRef = useRef(null)
  const processorRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const activeSourceRef = useRef(null)
  const nextPlayTimeRef = useRef(0)
  const sessionHandleRef = useRef(null)
  const connectTimeRef = useRef(null)
  const elapsedIntervalRef = useRef(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimerRef = useRef(null)
  const isReconnectRef = useRef(false)
  const sessionWarningRef = useRef(false)
  const disconnectingRef = useRef(false)
  // WHY: React StrictMode double-mounts components. Without this guard,
  // first mount opens WS, StrictMode unmount closes it, remount finds
  // state=CONNECTING and silently returns. mountedRef lets WS handlers
  // survive the unmount/remount cycle.
  const mountedRef = useRef(true)

  // ── Elapsed Timer ──────────────────────────────────────────────────────
  const startElapsedTimer = useCallback(() => {
    connectTimeRef.current = Date.now()
    sessionWarningRef.current = false
    elapsedIntervalRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - connectTimeRef.current) / 1000)
      setElapsed(secs)

      // Session limit warnings
      if (secs >= 13 * 60 && !sessionWarningRef.current) {
        sessionWarningRef.current = true
        // Inject warning into conversation
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            clientContent: { turnComplete: true, turns: [{ role: 'user', parts: [{ text: 'Session approaching limit, Sir. Please wrap up.' }] }] }
          }))
        }
      }

      // Auto-reconnect at 14.5 min
      if (secs >= 14.5 * 60) {
        isReconnectRef.current = true
        cleanupConnection()
        setTimeout(() => connectInternal(), 500)
      }
    }, 1000)
  }, [])

  const stopElapsedTimer = useCallback(() => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current)
      elapsedIntervalRef.current = null
    }
  }, [])

  // ── Audio Playback (gapless time-scheduled) ────────────────────────────
  const playAudioChunk = useCallback((base64Data) => {
    if (!playCtxRef.current) return
    const playCtx = playCtxRef.current

    const binaryStr = atob(base64Data)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

    const int16 = new Int16Array(bytes.buffer)
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768

    // Gemini outputs 24kHz audio
    const buffer = playCtx.createBuffer(1, float32.length, 24000)
    buffer.copyToChannel(float32, 0)

    const src = playCtx.createBufferSource()
    src.buffer = buffer
    src.connect(playCtx.destination)

    const now = playCtx.currentTime
    const startTime = Math.max(now + 0.02, nextPlayTimeRef.current)
    src.start(startTime)
    nextPlayTimeRef.current = startTime + buffer.duration

    activeSourceRef.current = src
  }, [])

  const flushPlayback = useCallback(() => {
    try { activeSourceRef.current?.stop() } catch { /* ok */ }
    activeSourceRef.current = null
    nextPlayTimeRef.current = 0
  }, [])

  // ── Mic Setup ──────────────────────────────────────────────────────────
  const startMic = useCallback(async () => {
    try {
      // Mic AudioContext: MUST be 16kHz
      micCtxRef.current = new AudioContext({ sampleRate: 16000 })

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        }
      })
      micStreamRef.current = stream

      const source = micCtxRef.current.createMediaStreamSource(stream)
      const processor = micCtxRef.current.createScriptProcessor(4096, 1, 1)

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return
        const float32 = e.inputBuffer.getChannelData(0)
        const int16 = new Int16Array(float32.length)
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32767)))
        }
        const uint8 = new Uint8Array(int16.buffer)
        // Convert to base64
        const binary = String.fromCharCode.apply(null, uint8)
        const base64 = btoa(binary)

        wsRef.current.send(JSON.stringify({
          realtimeInput: {
            audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
          }
        }))
      }

      source.connect(processor)
      processor.connect(micCtxRef.current.destination)
      sourceNodeRef.current = source
      processorRef.current = processor

      console.log('[GeminiVoice] 🎤 Mic started')
      setState(STATES.LISTENING)
    } catch (err) {
      console.error('[GeminiVoice] Mic error:', err)
      setError('Microphone access denied')
      setState(STATES.ERROR)
    }
  }, [])

  // ── Cleanup ────────────────────────────────────────────────────────────
  const cleanupConnection = useCallback(() => {
    // Stop mic
    try { processorRef.current?.disconnect() } catch { /* ok */ }
    try { sourceNodeRef.current?.disconnect() } catch { /* ok */ }
    try { micStreamRef.current?.getTracks().forEach(t => t.stop()) } catch { /* ok */ }
    try { micCtxRef.current?.close() } catch { /* ok */ }
    processorRef.current = null
    sourceNodeRef.current = null
    micStreamRef.current = null
    micCtxRef.current = null

    // Flush playback
    flushPlayback()

    // Close WebSocket
    try { wsRef.current?.close() } catch { /* ok */ }
    wsRef.current = null

    stopElapsedTimer()
  }, [flushPlayback, stopElapsedTimer])

  // ── WebSocket Connect ──────────────────────────────────────────────────
  const connectInternal = useCallback(() => {
    console.log('[GeminiVoice] connectInternal called')
    const settings = readLS('settings') || {}
    const apiKey = settings.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY
    console.log('[GeminiVoice] API key:', apiKey ? 'SET (' + apiKey.substring(0, 8) + '...)' : 'MISSING')
    if (!apiKey) {
      console.log('[GeminiVoice] No API key, staying DISCONNECTED')
      setState(STATES.DISCONNECTED)
      return
    }

    // Check voice enabled
    console.log('[GeminiVoice] geminiVoice setting:', settings.geminiVoice)
    if (settings.geminiVoice === false) {
      console.log('[GeminiVoice] Voice disabled, staying DISCONNECTED')
      setState(STATES.DISCONNECTED)
      return
    }

    setState(STATES.CONNECTING)
    setError(null)
    disconnectingRef.current = false

    // Playback AudioContext: native rate (browser resamples 24kHz→native)
    if (!playCtxRef.current || playCtxRef.current.state === 'closed') {
      playCtxRef.current = new AudioContext()
    }

    const voiceName = settings.geminiVoiceName || 'Charon'
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`

    console.log('[GeminiVoice] Creating WebSocket to:', url.substring(0, 80) + '...')
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      console.log('[GeminiVoice] WebSocket opened, sending setup...')
      // Send setup message immediately
      const setup = {
        setup: {
          model: 'models/gemini-3.1-flash-live-preview',
          generationConfig: {
            responseModalities: ['AUDIO', 'TEXT'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName }
              }
            },
            thinkingConfig: {
              thinkingLevel: 'low'
            }
          },
          realtimeInputConfig: {
            automaticActivityDetection: { disabled: false }
          },
          systemInstruction: {
            parts: [{ text: buildSystemPrompt() }]
          },
          tools: [{ functionDeclarations: toolDeclarations }],
        }
      }

      // Include session resumption handle if reconnecting
      if (sessionHandleRef.current) {
        setup.setup.sessionResumption = { handle: sessionHandleRef.current }
      }

      ws.send(JSON.stringify(setup))
      console.log('[GeminiVoice] Setup sent, model:', setup.setup.model)
    }

    ws.onmessage = async (event) => {
      if (!mountedRef.current) return
      let text
      if (event.data instanceof Blob) {
        text = await event.data.text()
      } else {
        text = event.data
      }

      let msg
      try { msg = JSON.parse(text) } catch { return }
      console.log('[GeminiVoice] Message received:', JSON.stringify(msg).substring(0, 200))

      // Setup complete
      if (msg.setupComplete) {
        console.log('[GeminiVoice] ✅ Setup complete! Starting mic...')
        setState(STATES.CONNECTED)
        reconnectCountRef.current = 0
        startElapsedTimer()

        // Start mic
        await startMic()

        // On first connect: speak boot briefing if available, else greet
        if (!isReconnectRef.current && ws.readyState === WebSocket.OPEN) {
          let spokenBriefing = false
          try {
            const weekly = JSON.parse(localStorage.getItem('jos-weekly') || '{}')
            const briefing = weekly.briefing?.text
            if (briefing) {
              ws.send(JSON.stringify({
                clientContent: { turnComplete: true, turns: [{ role: 'user', parts: [{ text: `Read this briefing aloud naturally (don't say "here is your briefing", just speak it as if you're delivering it): ${briefing}` }] }] }
              }))
              spokenBriefing = true
            }
          } catch { /* ok */ }
          if (!spokenBriefing) {
            ws.send(JSON.stringify({
              clientContent: { turnComplete: true, turns: [{ role: 'user', parts: [{ text: 'Greet Sir briefly. One sentence. Note the time of day.' }] }] }
            }))
          }
        }
        isReconnectRef.current = false
        return
      }

      // Session resumption handle
      if (msg.sessionResumption?.handle) {
        sessionHandleRef.current = msg.sessionResumption.handle
      }

      // GoAway — immediate reconnect
      if (msg.goAway) {
        isReconnectRef.current = true
        cleanupConnection()
        connectInternal()
        return
      }

      // Server content (audio + text from model)
      if (msg.serverContent) {
        const sc = msg.serverContent

        // Interrupted — stop playback
        if (sc.interrupted) {
          flushPlayback()
          setState(STATES.LISTENING)
          return
        }

        // Model turn parts
        if (sc.modelTurn?.parts) {
          for (const part of sc.modelTurn.parts) {
            if (part.inlineData?.data) {
              console.log('[GeminiVoice] 🔊 Playing audio chunk')
              setState(STATES.SPEAKING)
              playAudioChunk(part.inlineData.data)
            }
            if (part.text) {
              setTranscript(prev => ({ ...prev, output: part.text }))
            }
          }
        }

        // Turn complete — back to listening
        if (sc.turnComplete) {
          setState(STATES.LISTENING)
        }
      }

      // Tool calls
      if (msg.toolCall) {
        setState(STATES.PROCESSING)
        const functionCalls = msg.toolCall.functionCalls || []

        for (const fc of functionCalls) {
          const args = fc.args || {}

          if (fc.name === 'engage_deep_reasoning') {
            // Await deep reasoning result before sending toolResponse
            const result = await executeDeepReasoning(args, settings.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY)
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                toolResponse: {
                  functionResponses: [{
                    id: fc.id,
                    name: fc.name,
                    response: { result: JSON.stringify(result) }
                  }]
                }
              }))
            }
          } else {
            // Synchronous tools
            const result = executeTool(fc.name, args)
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                toolResponse: {
                  functionResponses: [{
                    id: fc.id,
                    name: fc.name,
                    response: { result: JSON.stringify(result) }
                  }]
                }
              }))
            }
          }
        }
      }
    }

    ws.onerror = (err) => {
      if (!mountedRef.current) return
      console.error('[GeminiVoice] ❌ WebSocket error:', err)
      if (!disconnectingRef.current) {
        setError('Connection error')
        setState(STATES.ERROR)
      }
    }

    ws.onclose = (e) => {
      console.log('[GeminiVoice] WebSocket closed, code:', e.code, 'reason:', e.reason)
      if (!mountedRef.current) return
      if (disconnectingRef.current) {
        setState(STATES.DISCONNECTED)
        return
      }

      // Protocol error (1007) or server error (1011) — don't retry, same error every time
      if (e.code === 1007 || e.code === 1011) {
        console.error(`[GeminiVoice] Error ${e.code}, not retrying:`, e.reason)
        setError(`Protocol error: ${e.reason || 'invalid payload'}`)
        setState(STATES.ERROR)
        return
      }

      // Auto-reconnect with exponential backoff
      if (reconnectCountRef.current < 5) {
        const delay = Math.pow(2, reconnectCountRef.current) * 1000
        reconnectCountRef.current++
        isReconnectRef.current = true
        setState(STATES.CONNECTING)
        reconnectTimerRef.current = setTimeout(() => {
          cleanupConnection()
          connectInternal()
        }, delay)
      } else {
        setState(STATES.ERROR)
        setError('Connection lost after 5 retries')
      }
    }
  }, [startMic, startElapsedTimer, cleanupConnection, flushPlayback, playAudioChunk])

  // ── Public: connect ────────────────────────────────────────────────────
  const connect = useCallback(() => {
    console.log('[GeminiVoice] connect() called, current state:', state)
    if (state === STATES.CONNECTING || state === STATES.CONNECTED || state === STATES.LISTENING || state === STATES.SPEAKING || state === STATES.PROCESSING) return
    reconnectCountRef.current = 0
    isReconnectRef.current = false
    connectInternal()
  }, [state, connectInternal])

  // ── Public: disconnect ─────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    disconnectingRef.current = true
    clearTimeout(reconnectTimerRef.current)
    cleanupConnection()
    setState(STATES.DISCONNECTED)
    setError(null)
    setElapsed(0)
  }, [cleanupConnection])

  // ── Event Listeners ────────────────────────────────────────────────────
  useEffect(() => {
    const handleSpeak = (e) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return
      const text = e.detail?.text
      if (!text) return
      wsRef.current.send(JSON.stringify({
        clientContent: { turnComplete: true, turns: [{ role: 'user', parts: [{ text }] }] }
      }))
    }

    const handleStop = () => {
      flushPlayback()
    }

    window.addEventListener('jarvis-speak', handleSpeak)
    window.addEventListener('jarvis-stop-audio', handleStop)

    // Global stop function for Escape key
    window.jarvisStop = () => {
      flushPlayback()
    }

    return () => {
      window.removeEventListener('jarvis-speak', handleSpeak)
      window.removeEventListener('jarvis-stop-audio', handleStop)
      delete window.jarvisStop
    }
  }, [flushPlayback])

  // ── Mount/unmount tracking ──────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      // Reset state so remount can call connect() again
      setState(STATES.DISCONNECTED)
      disconnectingRef.current = true
      clearTimeout(reconnectTimerRef.current)
      cleanupConnection()
    }
  }, [cleanupConnection])

  const isConnected = state === STATES.CONNECTED || state === STATES.LISTENING || state === STATES.SPEAKING || state === STATES.PROCESSING

  return {
    state,
    connect,
    disconnect,
    isConnected,
    elapsed,
    error,
    transcript,
  }
}
