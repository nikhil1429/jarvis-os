// micManager.js — Singleton shared mic stream
// WHY: Prevents multiple getUserMedia calls fighting over the mic hardware.
// All voice consumers (Gemini capture, VoiceMode analyser, useJarvisVoice STT)
// share one stream with echo cancellation + noise suppression.

let activeStream = null
let activeUsers = 0

const MIC_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000,
    channelCount: 1
  }
}

export async function getSharedMicStream() {
  if (activeStream && activeStream.active) {
    activeUsers++
    return activeStream
  }
  activeStream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS)
  activeUsers = 1
  return activeStream
}

export function releaseMicStream() {
  activeUsers--
  if (activeUsers <= 0) {
    if (activeStream) activeStream.getTracks().forEach(t => t.stop())
    activeStream = null
    activeUsers = 0
  }
}

export function isGeminiActive() {
  return !!window.__geminiConnected
}
