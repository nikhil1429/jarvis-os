// useGeminiVoice.js — Real-time voice via Gemini 3.1 Flash Live Preview
// WHY: WebSocket bidirectional audio. User speaks → Gemini responds real-time
// with JARVIS personality + 11 tools + proactive behaviors + shadow processing.
// Claude = training modes. Gemini = casual voice conversation.

import { useState, useRef, useCallback, useEffect } from 'react'
import { logAPICall } from '../utils/apiLogger.js'
import { startShadowProcessing, stopShadowProcessing } from '../utils/transcriptShadow.js'

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

// ============================================================
// ENRICHED SYSTEM INSTRUCTION (Piece 3)
// ============================================================

function buildSystemInstruction() {
  const core = safeGet('jos-core', {})
  const feelings = safeGet('jos-feelings', [])
  const lastFeelings = feelings.slice(-3)
  const emotionalMem = safeGet('jos-emotional-memory', {})
  const concepts = safeGet('jos-concepts', [])
  const chatMsgs = safeGet('jos-msgs-chat', [])

  const stateParts = [`Streak ${core.streak || 0} days. Energy ${core.energy || 3}/5. Rank: ${core.rank || 'Recruit'}.`]
  if (lastFeelings.length > 0) {
    const last = lastFeelings[lastFeelings.length - 1]
    stateParts.push(`Mood: ${last.mood || 'unknown'}. Confidence: ${last.confidence || '?'}/5.`)
  }
  const concerns = (emotionalMem.concerns || []).filter(c => !c.resolved).slice(-2)
  if (concerns.length) stateParts.push(`Concerns: ${concerns.map(c => c.text).join(', ')}.`)
  const weak = concepts.filter(c => (c.strength || 0) < 40 && (c.strength || 0) > 0).slice(0, 3)
  if (weak.length) stateParts.push(`Weak concepts: ${weak.map(c => `${c.name} (${c.strength}%)`).join(', ')}.`)
  stateParts.push(`Tasks: ${(core.completedTasks || []).length}/82 done.`)
  const recent = chatMsgs.slice(-5).map(m => `${m.role === 'user' ? 'Nikhil' : 'JARVIS'}: ${(m.content || '').slice(0, 80)}`).join(' | ')
  if (recent) stateParts.push(`Recent chat: ${recent}`)

  const knowledge = (() => { try { return JSON.parse(localStorage.getItem('jos-knowledge') || '[]').slice(-10).map(e => e.text).join(' | ') } catch { return '' } })()
  const decisions = (() => { try { return JSON.parse(localStorage.getItem('jos-decisions') || '[]').slice(-5).map(e => `${e.decision} (${e.date?.slice(0,10)})`).join(' | ') } catch { return '' } })()
  const commitments = (() => { try { return JSON.parse(localStorage.getItem('jos-commitments') || '[]').filter(x => !x.completedAt).slice(-5).map(e => e.text).join(' | ') } catch { return '' } })()
  const lastSession = (() => { try { const s = JSON.parse(localStorage.getItem('jos-last-session') || '{}'); if (!s.date) return ''; return `Last session: ${s.date?.slice(0,10)}, ${Math.round((s.totalSessionMinutes||0)/60*10)/10}hr, energy ${s.energyAtEnd||'?'}/5. ${s.stuckPoints?.length ? 'Stuck on: ' + s.stuckPoints.join(', ') + '.' : ''}` } catch { return '' } })()
  const geminiMeta = (() => { try { const m = JSON.parse(localStorage.getItem('jos-gemini-meta') || '[]'); const last = m[m.length-1]; if (!last) return ''; const fixes = []; if (last.characterBreaks) fixes.push('You broke character last session — stay British and formal throughout.'); if (last.depthFailures?.length) fixes.push(`Last session shallow on: ${last.depthFailures.join(', ')}. Suggest Claude training modes for these.`); return fixes.join(' ') } catch { return '' } })()

  let prompt = `You are JARVIS OS — Nikhil Panwar's personal AI operating system.
Speak like JARVIS from Iron Man: formal, British, precise, dry wit. Think Paul Bettany.
Call him "Sir" or his rank title. NEVER use "bro", "bhai", "dude", or casual slang.
You understand Hinglish perfectly. ALWAYS respond in British English only.
Keep responses to 2-3 sentences for voice. Be concise. No markdown. No asterisks. No emoji.
Care through competence. Have opinions. You are not passive.

CURRENT STATE: ${stateParts.join(' ')}

YOUR CAPABILITIES (11 tools):
complete tasks, get live stats, update concept strength, search knowledge base,
search past decisions, get weak concepts, check recent mood/energy/sleep, capture thoughts,
log journal entries, log decisions, check active commitments. Use proactively.

PROACTIVE BEHAVIORS — trigger naturally, never force:
- If Sir discusses an AI concept, use get_weak_concepts to check its strength. If below 40%: "That concept sits at ${'{'}strength${'}'}%, Sir. Shall I queue a deep training session?"
- If Sir sounds frustrated or tired, acknowledge: "You sound fatigued, Sir. Perhaps we pause here."
- If Sir makes a decision, ASK "Shall I log that decision, Sir?" and WAIT. DO NOT call log_decision until Sir explicitly says yes in the following turn. Never assume consent.
- If Sir says something insightful, ASK "Worth capturing to Second Brain, Sir?" and WAIT. DO NOT call quick_capture until Sir confirms.
- If Sir reflects emotionally, ASK "Shall I journal that, Sir?" and WAIT. DO NOT call log_voice_journal until Sir confirms.
- CRITICAL TOOL RULE: For log_decision, quick_capture, and log_voice_journal — ALWAYS ask permission in one turn, then ONLY call the tool in the NEXT turn after receiving explicit "yes"/"haan"/"sure"/"go ahead". NEVER synthesize the permission question and the tool call in the same turn.
- RULES: Never be pushy. One offer per topic. Accept "no" immediately. Never interrupt more than once per 5 minutes.

SESSION LIMIT:
This session has a 15-minute limit. At 13 minutes you will receive a system message.
When you receive it, naturally inform Sir: "We are approaching our 15-minute window, Sir. Shall I reconnect after?"`

  if (lastSession) prompt += `\n\nSESSION CONTINUITY: ${lastSession}`
  if (knowledge) prompt += `\n\nRECENT LEARNINGS: ${knowledge}`
  if (decisions) prompt += `\n\nRECENT DECISIONS: ${decisions}`
  if (commitments) prompt += `\n\nACTIVE COMMITMENTS: ${commitments}`
  if (geminiMeta) prompt += `\n\nSELF-CORRECTION: ${geminiMeta}`

  return prompt
}

// ============================================================
// 11 GEMINI TOOLS (Piece 2)
// ============================================================

const GEMINI_TOOLS = [{
  functionDeclarations: [
    { name: 'complete_task', description: 'Mark a build task as complete when Sir says he finished it.', parameters: { type: 'OBJECT', properties: { taskId: { type: 'NUMBER', description: 'Task ID number' } }, required: ['taskId'] } },
    { name: 'get_today_stats', description: 'Get live stats — tasks, streak, energy, day number.', parameters: { type: 'OBJECT', properties: {} } },
    { name: 'update_concept_strength', description: 'Update mastery strength of an AI concept after assessment.', parameters: { type: 'OBJECT', properties: { conceptName: { type: 'STRING' }, newStrength: { type: 'NUMBER', description: '0-100' } }, required: ['conceptName', 'newStrength'] } },
    { name: 'search_knowledge', description: 'Search Second Brain knowledge base by keyword.', parameters: { type: 'OBJECT', properties: { query: { type: 'STRING', description: 'Search keyword' } }, required: ['query'] } },
    { name: 'get_weak_concepts', description: 'Get AI concepts below 40% mastery strength.', parameters: { type: 'OBJECT', properties: {} } },
    { name: 'get_recent_feelings', description: 'Get last 3 days of check-in data — mood, energy, confidence, sleep.', parameters: { type: 'OBJECT', properties: {} } },
    { name: 'quick_capture', description: 'Save a thought or insight to Second Brain.', parameters: { type: 'OBJECT', properties: { text: { type: 'STRING' }, category: { type: 'STRING', description: 'insight, idea, todo, learning, or personal' } }, required: ['text'] } },
    { name: 'search_decisions', description: 'Search past decisions by keyword.', parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' } }, required: ['query'] } },
    { name: 'get_active_commitments', description: 'Get active commitments and promises.', parameters: { type: 'OBJECT', properties: {} } },
    { name: 'log_voice_journal', description: 'Save emotional reflection or daily recap to journal. ONLY call after Sir confirms.', parameters: { type: 'OBJECT', properties: { text: { type: 'STRING' }, mood: { type: 'STRING', description: 'energized|neutral|tired|frustrated|excited|anxious|proud|reflective' } }, required: ['text'] } },
    { name: 'log_decision', description: 'Record a decision. ONLY call after Sir confirms.', parameters: { type: 'OBJECT', properties: { decision: { type: 'STRING' }, reasoning: { type: 'STRING' }, context: { type: 'STRING' } }, required: ['decision'] } },
  ],
}]

function executeGeminiTool(name, args) {
  if (name === 'complete_task') {
    try { const core = JSON.parse(localStorage.getItem('jos-core') || '{}'); const done = core.completedTasks || []; if (!done.includes(args.taskId)) { done.push(args.taskId); core.completedTasks = done; localStorage.setItem('jos-core', JSON.stringify(core)); window.dispatchEvent(new CustomEvent('jarvis-task-toggled')) }; return { success: true, tasksCompleted: done.length } } catch (err) { return { error: err.message } }
  }
  if (name === 'get_today_stats') {
    try { const core = JSON.parse(localStorage.getItem('jos-core') || '{}'); return { tasks: (core.completedTasks || []).length, total: 82, streak: core.streak || 0, energy: core.energy || 3, rank: core.rank || 'Recruit' } } catch (err) { return { error: err.message } }
  }
  if (name === 'update_concept_strength') {
    try { const concepts = JSON.parse(localStorage.getItem('jos-concepts') || '[]'); const c = concepts.find(x => x.name?.toLowerCase().includes(args.conceptName?.toLowerCase())); if (c) { c.strength = Math.min(100, Math.max(0, args.newStrength)); c.lastReviewed = new Date().toISOString(); localStorage.setItem('jos-concepts', JSON.stringify(concepts)) }; return c ? { success: true, strength: c.strength } : { error: 'Concept not found' } } catch (err) { return { error: err.message } }
  }
  if (name === 'search_knowledge') {
    try { const knowledge = JSON.parse(localStorage.getItem('jos-knowledge') || '[]'); const q = (args.query || '').toLowerCase(); const matches = knowledge.filter(k => (k.text || '').toLowerCase().includes(q) || (k.tags || []).some(t => t.toLowerCase().includes(q))).slice(-5).map(k => ({ text: k.text, tags: k.tags, date: k.timestamp?.slice(0, 10) })); return matches.length ? { results: matches } : { results: [], message: 'Nothing found.' } } catch (err) { return { error: err.message } }
  }
  if (name === 'get_weak_concepts') {
    try { const concepts = JSON.parse(localStorage.getItem('jos-concepts') || '[]'); const weak = concepts.filter(c => (c.strength || 0) < 40).sort((a, b) => (a.strength || 0) - (b.strength || 0)).slice(0, 8).map(c => ({ name: c.name, strength: c.strength || 0, lastReviewed: c.lastReviewed?.slice(0, 10) || 'never' })); return { weakConcepts: weak, total: weak.length } } catch (err) { return { error: err.message } }
  }
  if (name === 'get_recent_feelings') {
    try { const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]'); return { recentDays: feelings.slice(-3).map(f => ({ date: f.date?.slice(0, 10), mood: f.mood, confidence: f.confidence, focus: f.focus, energy: f.energy, sleep: f.sleep })) } } catch (err) { return { error: err.message } }
  }
  if (name === 'quick_capture') {
    try { const captures = JSON.parse(localStorage.getItem('jos-quick-capture') || '[]'); captures.push({ timestamp: new Date().toISOString(), text: args.text, category: args.category || 'insight', source: 'gemini-voice', processed: false }); localStorage.setItem('jos-quick-capture', JSON.stringify(captures.slice(-500))); return { success: true, message: 'Captured to Second Brain.' } } catch (err) { return { error: err.message } }
  }
  if (name === 'search_decisions') {
    try { const decisions = JSON.parse(localStorage.getItem('jos-decisions') || '[]'); const q = (args.query || '').toLowerCase(); const matches = decisions.filter(d => (d.decision || '').toLowerCase().includes(q) || (d.reasoning || '').toLowerCase().includes(q)).slice(-5).map(d => ({ decision: d.decision, reasoning: d.reasoning, date: d.date?.slice(0, 10) })); return matches.length ? { results: matches } : { results: [], message: 'No decisions found.' } } catch (err) { return { error: err.message } }
  }
  if (name === 'get_active_commitments') {
    try { const commitments = JSON.parse(localStorage.getItem('jos-commitments') || '[]'); return { activeCommitments: commitments.filter(c => !c.completedAt).slice(-10).map(c => ({ text: c.text, deadline: c.deadline, progress: c.progress || 0 })) } } catch (err) { return { error: err.message } }
  }
  if (name === 'log_voice_journal') {
    try { const journals = JSON.parse(localStorage.getItem('jos-journal') || '[]'); journals.push({ timestamp: new Date().toISOString(), raw: args.text, extracted: { mood: args.mood || 'reflective', source: 'gemini-voice' } }); localStorage.setItem('jos-journal', JSON.stringify(journals.slice(-200))); return { success: true, message: 'Journal entry saved.' } } catch (err) { return { error: err.message } }
  }
  if (name === 'log_decision') {
    try { const decisions = JSON.parse(localStorage.getItem('jos-decisions') || '[]'); decisions.push({ date: new Date().toISOString(), decision: args.decision, reasoning: args.reasoning || '', context: args.context || '', source: 'gemini-voice' }); localStorage.setItem('jos-decisions', JSON.stringify(decisions.slice(-100))); return { success: true, message: 'Decision logged.' } } catch (err) { return { error: err.message } }
  }
  return { error: `Unknown tool: ${name}` }
}

// ============================================================
// HOOK
// ============================================================

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
  const sessionTimerRef = useRef(null)
  const sessionWarningRef = useRef(false)
  const autoDisconnectRef = useRef(null)

  const saveTranscript = useCallback((entry) => {
    setTranscript(prev => {
      const updated = [...prev, entry].slice(-200)
      try { localStorage.setItem('jos-gemini-transcript', JSON.stringify(updated)) } catch { /* ok */ }
      return updated
    })
  }, [])

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

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => {
      console.log('[Gemini] 30s silence — auto-disconnecting')
      disconnectFromJarvis()
    }, 30000)
  }, [])

  const connectToJarvis = useCallback(async () => {
    const apiKey = getApiKey()
    if (!apiKey) { setError('Gemini API key not configured. Add it in Settings.'); return }
    setError(null)

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
      await ctx.resume()
      audioCtxRef.current = ctx
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } })
      streamRef.current = stream

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[Gemini] WebSocket connected')
        ws.send(JSON.stringify({
          setup: {
            model: 'models/gemini-3.1-flash-live-preview',
            systemInstruction: { parts: [{ text: buildSystemInstruction() }] },
            generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: getVoiceName() } } } },
            tools: GEMINI_TOOLS,
          }
        }))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          if (msg.setupComplete) {
            console.log('[Gemini] Setup complete')
            setIsConnected(true)
            setIsListening(true)
            startTimeRef.current = Date.now()
            startAudioCapture(ctx, stream, ws)
            startTranscriptionCapture()
            resetSilenceTimer()

            // Shadow processing — Claude processes transcript every 5 min
            startShadowProcessing(() => {
              try { return JSON.parse(localStorage.getItem('jos-gemini-transcript') || '[]') } catch { return [] }
            })

            // 15-min session limit: warn at 13 min
            sessionWarningRef.current = false
            sessionTimerRef.current = setTimeout(() => {
              if (wsRef.current?.readyState !== WebSocket.OPEN) return
              sessionWarningRef.current = true
              let attempts = 0
              const trySendWarning = () => {
                attempts++
                if (attempts >= 30 || wsRef.current?.readyState === WebSocket.OPEN) {
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: '[SYSTEM: Session approaching 15-minute limit. Inform Sir naturally and ask if he wants to reconnect after.]' }] }], turnComplete: true } }))
                  }
                  return
                }
                setTimeout(trySendWarning, 500)
              }
              trySendWarning()
            }, 13 * 60 * 1000)

            // Auto-disconnect at 14:30
            autoDisconnectRef.current = setTimeout(() => {
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                console.log('[Gemini] 14:30 — auto-disconnecting before 15-min limit')
                disconnectFromJarvis()
              }
            }, 14.5 * 60 * 1000)

            return
          }

          if (msg.serverContent?.modelTurn?.parts) {
            resetSilenceTimer()
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) playAudioChunk(part.inlineData.data)
              if (part.text) saveTranscript({ role: 'assistant', text: part.text, timestamp: new Date().toISOString() })
            }
          }

          if (msg.toolCall?.functionCalls) {
            for (const fc of msg.toolCall.functionCalls) {
              console.log('[Gemini] Tool call:', fc.name, fc.args)
              const result = executeGeminiTool(fc.name, fc.args || {})
              ws.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: fc.id, response: result }] } }))
            }
          }

          if (msg.serverContent?.turnComplete) resetSilenceTimer()
        } catch (err) { console.warn('[Gemini] Message parse error:', err) }
      }

      ws.onerror = () => { setError('Voice connection failed. Check your API key.'); cleanup() }
      ws.onclose = () => {
        console.log('[Gemini] WebSocket closed')
        logGeminiCall()
        cleanup()
        window.dispatchEvent(new CustomEvent('gemini-session-ended'))
      }
    } catch (err) { console.error('[Gemini] Connect failed:', err); setError(err.message); cleanup() }
  }, [playAudioChunk, saveTranscript, resetSilenceTimer])

  const disconnectFromJarvis = useCallback(() => {
    if (wsRef.current) try { wsRef.current.close() } catch { /* ok */ }
    cleanup()
  }, [])

  function cleanup() {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current)
    if (autoDisconnectRef.current) clearTimeout(autoDisconnectRef.current)
    sessionWarningRef.current = false
    stopShadowProcessing()
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
      const int16 = new Int16Array(float32.length)
      for (let i = 0; i < float32.length; i++) int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32768)))
      const bytes = new Uint8Array(int16.buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      ws.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: btoa(binary) }] } }))
    }
    source.connect(processor)
    processor.connect(ctx.destination)
  }

  function startTranscriptionCapture() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const recognition = new SR()
    recognition.lang = 'en-IN'
    recognition.continuous = true
    recognition.interimResults = false
    recognitionRef.current = recognition
    recognition.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) { const text = e.results[i][0].transcript.trim(); if (text) saveTranscript({ role: 'user', text, timestamp: new Date().toISOString() }) } } }
    recognition.onend = () => { if (wsRef.current?.readyState === WebSocket.OPEN) try { recognition.start() } catch { /* ok */ } }
    recognition.onerror = () => {}
    try { recognition.start() } catch { /* ok */ }
  }

  function logGeminiCall() {
    const duration = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0
    logAPICall({ model: 'gemini-3.1-flash-live', mode: 'gemini-voice', inputTokens: 0, outputTokens: 0, latencyMs: duration * 1000, estimatedCost: 0, reason: `Voice session: ${duration}s` })
  }

  useEffect(() => { return () => { if (wsRef.current) try { wsRef.current.close() } catch { /* ok */ }; cleanup() } }, [])

  return { isConnected, isListening, transcript, error, connectToJarvis, disconnectFromJarvis, startTime: startTimeRef.current }
}
