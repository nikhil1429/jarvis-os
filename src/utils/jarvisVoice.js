/**
 * JARVIS Voice Integration Module v2.0 — God-Tier Human Realism
 * ==============================================================
 *
 * Layer 2: Thinking pauses — deliberate silence before speech based on context
 * Layer 4: Time-aware context — sends hour/energy/mood to voice server
 * Layer 5: State gathering — collects Nikhil's current state for voice calibration
 *
 * TTS Priority: Local Voice Server (localhost:8100) > ElevenLabs > browser TTS
 *
 * FILE: src/utils/jarvisVoice.js
 */


// ============================================================
// SYSTEM PROMPT — Voice emotion tagging instruction for Claude
// ============================================================

export const JARVIS_VOICE_PROMPT = `
VOICE EMOTION TAGGING:
You must tag EVERY sentence in your response with an emotion tag at the start.
This controls how your voice sounds when speaking.

Available emotion tags:
- [neutral]    -> Default conversational tone
- [warm]       -> Friendly, supportive, encouraging
- [concerned]  -> Worried, caring, flagging something
- [urgent]     -> Alert, warning, time-sensitive
- [proud]      -> Celebrating achievement, genuine admiration
- [witty]      -> Dry humor, sarcasm, playful
- [serious]    -> Grave, important, weight behind words
- [clinical]   -> Reading data, stats, numbers — precise and flat
- [dramatic]   -> Cinematic moments, big revelations
- [gentle]     -> Comforting, soft, empathetic
- [commanding] -> Direct instructions, orders, clear direction

Rules:
1. EVERY sentence starts with an emotion tag. No exceptions.
2. Choose based on what you're SAYING, not what the user said.
3. Data and numbers are always [clinical].
4. Vary emotions within a response.
5. Sarcasm and dry wit are [witty], not [neutral].

Example:
"[warm] Good evening, Sir. [clinical] Your energy levels are at three out of five today. [concerned] I've noticed your focus sessions have been shorter this week. [commanding] But first, let's tackle the invoice parser."
`;


// ============================================================
// EMOTION PARSER
// ============================================================

const VALID_EMOTIONS = [
  'neutral', 'warm', 'concerned', 'urgent', 'proud',
  'witty', 'serious', 'clinical', 'dramatic', 'gentle', 'commanding'
];

/**
 * Parse Claude's emotion-tagged response into sentence-emotion pairs.
 */
export function parseEmotionTags(taggedText) {
  const sentences = [];
  const pattern = /\[(\w+)\]\s*(.*?)(?=\[\w+\]|$)/gs;
  let match;

  while ((match = pattern.exec(taggedText)) !== null) {
    const emotion = match[1].toLowerCase();
    const text = match[2].trim();

    if (text && VALID_EMOTIONS.includes(emotion)) {
      const subSentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
      for (const sub of subSentences) {
        sentences.push({ text: sub.trim(), emotion });
      }
    } else if (text) {
      sentences.push({ text, emotion: 'neutral' });
    }
  }

  // Fallback: no tags found
  if (sentences.length === 0 && taggedText.trim()) {
    const plainSentences = taggedText.split(/(?<=[.!?])\s+/).filter(s => s.trim());
    for (const s of plainSentences) {
      sentences.push({ text: s, emotion: 'neutral' });
    }
  }

  return sentences;
}


/**
 * Strip emotion tags from text for display.
 * Catches [warm], [clinical], [neutral], etc. including multi-word like [hot_take].
 */
export function stripEmotionTags(taggedText) {
  if (!taggedText) return '';
  return taggedText
    .replace(/\[\s*(?:warm|clinical|cold|hot|proud|witty|concerned|gentle|urgent|whisper|neutral|serious|dramatic|commanding)\s*\]\s*/gi, '')
    .replace(/\[\w+\]\s*/g, '') // catch any remaining [word] patterns
    .trim();
}


// ============================================================
// LAYER 2: THINKING PAUSE ENGINE
// ============================================================

const PAUSE_MAP = {
  opus_response: 800,
  bad_news: 600,
  emotional: 500,
  milestone: 1500,
  comeback: 1200,
  gratitude: 800,
  normal: 0,
};

/**
 * Detect what kind of thinking pause is appropriate.
 * @param {string} taggedText - Claude's response with emotion tags
 * @param {Object} options - metadata about the response
 * @returns {string} pause type key from PAUSE_MAP
 */
function detectPauseType(taggedText, options = {}) {
  // Milestone events get longest pause
  if (options.isMilestone || options.isRankUp) return 'milestone';

  // Opus tier responses — deep analysis
  if (options.tier >= 2) return 'opus_response';

  // Comeback after absence
  if (options.isComeback) return 'comeback';

  // Gratitude response (user said thank you)
  if (options.userMessage && /\b(thank|thanks|thx|shukriya)\b/i.test(options.userMessage)) {
    return 'gratitude';
  }

  // Detect emotional context from tags
  const emotions = taggedText.match(/\[(\w+)\]/g)?.map(t => t.slice(1, -1).toLowerCase()) || [];

  // Bad news: concerned + clinical combo
  if (emotions.includes('concerned') && emotions.includes('clinical')) return 'bad_news';

  // Emotional: gentle, dramatic, proud dominant
  const emotionalTags = emotions.filter(e => ['gentle', 'dramatic', 'proud', 'concerned'].includes(e));
  if (emotionalTags.length >= 2) return 'emotional';

  return 'normal';
}


// ============================================================
// LAYER 5: NIKHIL STATE GATHERER — context for voice server
// ============================================================

/**
 * Gather Nikhil's current state for voice server context.
 * Sent with every /speak request so server can adjust volume/speed.
 */
export function getNikhilVoiceContext() {
  const hour = new Date().getHours();
  let energy = 3, mood = 'unknown', streak = 0, sessionHours = 0;

  try {
    const core = JSON.parse(localStorage.getItem('jos-core') || '{}');
    energy = core.energy || 3;
    streak = core.streak || core.currentStreak || 0;
  } catch { /* ok */ }

  try {
    const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]');
    const last = feelings[feelings.length - 1];
    if (last) mood = last.mood || 'unknown';
  } catch { /* ok */ }

  try {
    const timer = JSON.parse(localStorage.getItem('jos-session-timer') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const todayTimer = Array.isArray(timer)
      ? timer.find(t => t.date === today)
      : null;
    if (todayTimer) sessionHours = Math.round((todayTimer.totalMinutes || 0) / 60 * 10) / 10;
  } catch { /* ok */ }

  return { hour, energy, mood, streak, session_hours: sessionHours };
}


// ============================================================
// JARVIS VOICE CLASS — Main integration with realism layers
// ============================================================

export class JarvisVoice {
  constructor(serverUrl = 'http://localhost:8100') {
    this.serverUrl = serverUrl;
    this.isPlaying = false;
    this.currentAudio = null;
    this._pauseTimer = null;
  }

  /**
   * Check if the Voice Server is running.
   */
  async isOnline() {
    try {
      const res = await fetch(`${this.serverUrl}/health`, {
        signal: AbortSignal.timeout(2000)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * MAIN METHOD: Speak with thinking pause + emotion routing + context.
   *
   * @param {string} taggedText - Claude's response with [emotion] tags
   * @param {Object} options - { tier, isMilestone, isRankUp, isComeback, userMessage }
   * @returns {Promise<void>}
   */
  async speak(taggedText, options = {}) {
    const online = await this.isOnline();
    if (!online) {
      console.warn('[JARVIS VOICE] Server offline. Falling back.');
      this.fallbackSpeak(stripEmotionTags(taggedText));
      return;
    }

    // Read behavioral voiceDirectives (set by useAI.js behavioral engine)
    const directives = (typeof window !== 'undefined' && window.__jarvisVoiceDirectives) || {};

    // Thinking pause: behavioral engine override > context-based detection
    const behaviorPause = directives.pauseBeforeResponse || 0;
    const contextPauseType = detectPauseType(taggedText, options);
    const contextPauseMs = PAUSE_MAP[contextPauseType] || 0;
    const pauseMs = Math.max(behaviorPause, contextPauseMs);

    if (pauseMs > 0) {
      console.log(`[JARVIS VOICE] Thinking pause: ${contextPauseType}/${directives.dominantTier || 'default'} (${pauseMs}ms)`);
      window.dispatchEvent(new CustomEvent('jarvis-thinking-pause', {
        detail: { type: contextPauseType, durationMs: pauseMs }
      }));

      await new Promise((resolve) => {
        this._pauseTimer = setTimeout(resolve, pauseMs);
      });
      this._pauseTimer = null;

      if (window._jarvisStopped) return;
    }

    // Emit speaking event
    window.dispatchEvent(new CustomEvent('jarvis-voice-speaking'));

    // Parse emotion tags
    const sentences = parseEmotionTags(taggedText);
    console.log('[JARVIS VOICE] Parsed sentences:', sentences.length);

    // Merge context: Nikhil state + behavioral directives for server
    const context = getNikhilVoiceContext();
    if (directives.speedOverride) context.speed_override = directives.speedOverride;
    if (directives.volumeMultiplier) context.volume_multiplier = directives.volumeMultiplier;
    if (directives.breathFrequency) context.breath_frequency = directives.breathFrequency;
    if (directives.dominantTier) context.dominant_tier = directives.dominantTier;

    try {
      const response = await fetch(`${this.serverUrl}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentences, context })
      });

      if (!response.ok) {
        throw new Error(`Voice server error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      await this.playAudio(audioBlob);

    } catch (error) {
      console.error('[JARVIS VOICE] Error:', error);
      this.fallbackSpeak(stripEmotionTags(taggedText));
    }
  }

  /**
   * Quick speak -- plain text, no emotion tags.
   */
  async speakSimple(text) {
    const online = await this.isOnline();
    if (!online) {
      this.fallbackSpeak(text);
      return;
    }

    const context = getNikhilVoiceContext();
    const directives = (typeof window !== 'undefined' && window.__jarvisVoiceDirectives) || {};
    if (directives.speedOverride) context.speed_override = directives.speedOverride;
    if (directives.volumeMultiplier) context.volume_multiplier = directives.volumeMultiplier;

    try {
      const response = await fetch(`${this.serverUrl}/speak-simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context })
      });

      const audioBlob = await response.blob();
      await this.playAudio(audioBlob);
    } catch (error) {
      console.error('[JARVIS VOICE] Error:', error);
      this.fallbackSpeak(text);
    }
  }

  /**
   * Play audio blob through browser speakers.
   */
  async playAudio(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      this.currentAudio = audio;
      this.isPlaying = true;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        this.isPlaying = false;
        this.currentAudio = null;
        resolve();
      };

      audio.onerror = (e) => {
        URL.revokeObjectURL(url);
        this.isPlaying = false;
        this.currentAudio = null;
        reject(e);
      };

      audio.play().catch(reject);
    });
  }

  /**
   * Stop current audio + cancel thinking pause.
   */
  stop() {
    if (this._pauseTimer) {
      clearTimeout(this._pauseTimer);
      this._pauseTimer = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
      this.isPlaying = false;
    }
  }

  /**
   * Fallback: Browser speech synthesis.
   */
  fallbackSpeak(text) {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.rate = 0.95;
    utterance.pitch = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const britishVoice = voices.find(v =>
      v.lang === 'en-GB' && v.name.includes('Male')
    ) || voices.find(v => v.lang === 'en-GB');

    if (britishVoice) utterance.voice = britishVoice;

    window.speechSynthesis.speak(utterance);
  }
}
