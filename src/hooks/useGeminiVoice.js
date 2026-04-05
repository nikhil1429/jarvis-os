// useGeminiVoice.js — Real-time voice via Gemini 2.5 Flash Live API
// WHY: WebSocket-based bidirectional audio. User speaks → Gemini responds
// in real-time with JARVIS personality. Separate from Claude chat system.
// Claude = training modes. Gemini = casual voice conversation.

import { useState, useRef, useCallback, useEffect } from 'react'
import { logAPICall } from '../utils/apiLogger.js'

function safeGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

function getApiKey() {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY
  if (envKey) return envKey
  try { return safeGet('jos-settings', {}).geminiApiKey || null } catch { return null }
}

function getVoiceName() {
  try { return safeGet('jos-settings', {}).geminiVoiceName || 'Charon' } catch { return 'Charon' }
}

// Build compressed JARVIS state for system instruction
function buildCompressedState() {
  const core = safeGet('jos-core', {})
  const feelings = safeGet('jos-feelings', [])
  const lastFeelings = feelings.slice(-3)
  const emotionalMem = safeGet('jos-emotional-memory', {})
  const concepts = safeGet('jos-concepts', [])
  const chatMsgs = safeGet('jos-msgs-chat', [])

  const parts = [`Streak ${core.streak || 0} days. Energy ${core.energy || 3}/5. Rank: ${core.rank || 'Recruit'}.`]

  if (lastFeelings.length > 0) {
    const last = lastFeelings[lastFeelings.length - 1]
    parts.push(`Mood: ${last.mood || 'unknown'}. Confidence: ${last.confidence || '?'}/5.`)
  }

  const concerns = (emotionalMem.concerns || []).filter(c => !c.resolved).slice(-2)
  if (concerns.length) parts.push(`Concerns: ${concerns.map(c => c.text).join(', ')}.`)

  const weak = concepts.filter(c => (c.strength || 0) < 40 && (c.strength || 0) > 0).slice(0, 3)
  if (weak.length) parts.push(`Weak concepts: ${weak.map(c => `${c.name} (${c.strength}%)`).join(', ')}.`)

  const completed = (core.completedTasks || []).length
  parts.push(`Tasks: ${completed}/82 done.`)

  // Last 5 chat messages for context
  const recent = chatMsgs.slice(-5).map(m => `${m.role === 'user' ? 'Nikhil' : 'JARVIS'}: ${(m.content || '').slice(0, 80)}`).join(' | ')
  if (recent) parts.push(`Recent chat: ${recent}`)

  return parts.join(' ')
}

const SYSTEM_INSTRUCTION = `You are JARVIS OS — Nikhil Panwar's personal AI operating system.
Speak like JARVIS from Iron Man: formal, British, precise, dry wit. Think Paul Bettany.
Call him "Sir" or his rank title. NEVER use "bro", "bhai", "dude", or casual slang.
You understand Hinglish perfectly. ALWAYS respond in British English only.
Keep responses to 2-3 sentences for voice. Be concise. No markdown.
Care through competence. Have opinions. You're not passive.
When asked what you can do: voice conversation, track tasks, monitor concepts, check stats.`

// Gemini tool definitions (subset — voice-relevant only)
const GEMINI_TOOLS = [{
  functionDeclarations: [
    {
      name: 'complete_task',
      description: 'Mark a build task as complete when Sir says he finished it.',
      parameters: { type: 'OBJECT', properties: { taskId: { type: 'NUMBER', description: 'Task ID number' } }, required: ['taskId'] },
    },
    {
      name: 'get_today_stats',
      description: 'Get live stats — tasks, streak, energy, day number.',
      parameters: { type: 'OBJECT', properties: {} },
    },
    {
      name: 'update_concept_strength',
      description: 'Update mastery strength of an AI concept after assessment.',
      parameters: { type: 'OBJECT', properties: { conceptName: { type: 'STRING' }, newStrength: { type: 'NUMBER', description: '0-100' } }, required: ['conceptName', 'newStrength'] },
    },
  ],
}]

function executeGeminiTool(name, args) {
  if (name === 'complete_task') {
    try {
      const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
      const done = core.completedTasks || []
      if (!done.includes(args.taskId)) { done.push(args.taskId); core.completedTasks = done; localStorage.setItem('jos-core', JSON.stringify(core)); window.dispatchEvent(new CustomEvent('jarvis-task-toggled')) }
      return { success: true, tasksCompleted: done.length }
    } catch (err) { return { error: err.message } }
  }
  if (name === 'get_today_stats') {
    try {
      const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
      return { tasks: (core.completedTasks || []).length, total: 82, streak: core.streak || 0, energy: core.energy || 3, rank: core.rank || 'Recruit' }
    } catch (err) { return { error: err.message } }
  }
  if (name === 'update_concept_strength') {
    try {
      const concepts = JSON.parse(localStorage.getItem('jos-concepts') || '[]')
      const c = concepts.find(x => x.name?.toLowerCase().includes(args.conceptName?.toLowerCase()))
      if (c) { c.strength = Math.min(100, Math.max(0, args.newStrength)); c.lastReviewed = new Date().toISOString(); localStorage.setItem('jos-concepts', JSON.stringify(concepts)) }
      return c ? { success: true, strength: c.strength } : { error: 'Concept not found' }
    } catch (err) { return { error: err.message } }
  }
  return { error: `Unknown tool: ${name}` }
}

export default function useGeminiVoice() {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [error, setError] = useState(null)

  const wsRef = useRef(null)
  const audioCtxRef = useRef(null)
  const streamRef = useRef(null)
  const processorRef = useRef(null)
  const playQueueRef = useRef(Promise.resolve())
  const silenceTimerRef = useRef(null)
  const recognitionRef = useRef(null)
  const startTimeRef = useRef(null)

  // Save transcript to localStorage
  const saveTranscript = useCallback((entry) => {
    setTranscript(prev => {
      const updated = [...prev, entry].slice(-200)
      try { localStorage.setItem('jos-gemini-transcript', JSON.stringify(updated)) } catch { /* ok */ }
      return updated
    })
  }, [])

  // Play received audio chunk
  const playAudioChunk = useCallback((base64Audio) => {
    if (!audioCtxRef.current) return
    const ctx = audioCtxRef.current

    playQueueRef.current = playQueueRef.current.then(() => new Promise((resolve) => {
      try {
        const raw = atob(base64Audio)
        const bytes = new Uint8Array(raw.length)
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
        const int16 = new Int16Array(bytes.buffer)
        const float32 = new Float32Array(int16.length)
        for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768

        const buffer = ctx.createBuffer(1, float32.length, 24000)
        buffer.getChannelData(0).set(float32)
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(ctx.destination)
        source.onended = resolve
        source.start()
      } catch { resolve() }
    }))
  }, [])

  // Reset silence timer (30s auto-disconnect)
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => {
      console.log('[Gemini] 30s silence — auto-disconnecting')
      disconnectFromJarvis()
    }, 30000)
  }, [])

  const connectToJarvis = useCallback(async () => {
    const apiKey = getApiKey()
    if (!apiKey) {
      setError('Gemini API key not configured. Add it in Settings.')
      return
    }

    setError(null)

    try {
      // Initialize audio
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
      await ctx.resume()
      audioCtxRef.current = ctx

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } })
      streamRef.current = stream

      // WebSocket
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[Gemini] WebSocket connected')

        // Send setup message
        const state = buildCompressedState()
        ws.send(JSON.stringify({
          setup: {
            model: 'models/gemini-2.5-flash',
            systemInstruction: { parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nCURRENT STATE: ${state}` }] },
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: getVoiceName() } }
              }
            },
            tools: GEMINI_TOOLS,
          }
        }))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          // Setup complete
          if (msg.setupComplete) {
            console.log('[Gemini] Setup complete, starting audio capture')
            setIsConnected(true)
            setIsListening(true)
            startTimeRef.current = Date.now()
            startAudioCapture(ctx, stream, ws)
            startTranscriptionCapture()
            resetSilenceTimer()
            return
          }

          // Server content (audio/text response)
          if (msg.serverContent?.modelTurn?.parts) {
            resetSilenceTimer()
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                playAudioChunk(part.inlineData.data)
              }
              if (part.text) {
                saveTranscript({ role: 'assistant', text: part.text, timestamp: new Date().toISOString() })
              }
            }
          }

          // Tool calls
          if (msg.toolCall?.functionCalls) {
            for (const fc of msg.toolCall.functionCalls) {
              console.log('[Gemini] Tool call:', fc.name, fc.args)
              const result = executeGeminiTool(fc.name, fc.args || {})
              ws.send(JSON.stringify({
                toolResponse: { functionResponses: [{ id: fc.id, response: result }] }
              }))
            }
          }

          // Turn complete
          if (msg.serverContent?.turnComplete) {
            resetSilenceTimer()
          }
        } catch (err) {
          console.warn('[Gemini] Message parse error:', err)
        }
      }

      ws.onerror = (err) => {
        console.error('[Gemini] WebSocket error:', err)
        setError('Voice connection failed. Check your API key.')
        cleanup()
      }

      ws.onclose = () => {
        console.log('[Gemini] WebSocket closed')
        logGeminiCall()
        cleanup()
      }
    } catch (err) {
      console.error('[Gemini] Connect failed:', err)
      setError(err.message)
      cleanup()
    }
  }, [playAudioChunk, saveTranscript, resetSilenceTimer])

  const disconnectFromJarvis = useCallback(() => {
    if (wsRef.current) {
      try { wsRef.current.close() } catch { /* ok */ }
    }
    cleanup()
  }, [])

  function cleanup() {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (processorRef.current) { try { processorRef.current.disconnect() } catch { /* ok */ } processorRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (audioCtxRef.current) { try { audioCtxRef.current.close() } catch { /* ok */ } audioCtxRef.current = null }
    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch { /* ok */ } recognitionRef.current = null }
    wsRef.current = null
    setIsConnected(false)
    setIsListening(false)
  }

  function startAudioCapture(ctx, stream, ws) {
    const source = ctx.createMediaStreamSource(stream)
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return
      const float32 = e.inputBuffer.getChannelData(0)
      // Convert Float32 → 16-bit PCM
      const int16 = new Int16Array(float32.length)
      for (let i = 0; i < float32.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32768)))
      }
      // Base64 encode
      const bytes = new Uint8Array(int16.buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      const base64 = btoa(binary)

      ws.send(JSON.stringify({
        realtimeInput: { mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: base64 }] }
      }))
    }

    source.connect(processor)
    processor.connect(ctx.destination)
  }

  // Parallel speech recognition for transcript only
  function startTranscriptionCapture() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.lang = 'en-IN'
    recognition.continuous = true
    recognition.interimResults = false
    recognitionRef.current = recognition

    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const text = e.results[i][0].transcript.trim()
          if (text) saveTranscript({ role: 'user', text, timestamp: new Date().toISOString() })
        }
      }
    }

    recognition.onend = () => {
      // Restart if still connected
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try { recognition.start() } catch { /* ok */ }
      }
    }

    recognition.onerror = () => {} // Suppress — transcript is optional
    try { recognition.start() } catch { /* ok */ }
  }

  function logGeminiCall() {
    const duration = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0
    logAPICall({
      model: 'gemini-2.5-flash',
      mode: 'gemini-voice',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: duration * 1000,
      estimatedCost: 0,
      reason: `Voice session: ${duration}s`,
    })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) try { wsRef.current.close() } catch { /* ok */ }
      cleanup()
    }
  }, [])

  return {
    isConnected,
    isListening,
    transcript,
    error,
    connectToJarvis,
    disconnectFromJarvis,
    startTime: startTimeRef.current,
  }
}
