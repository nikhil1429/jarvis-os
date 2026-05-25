// geminiProRest.js — Single-purpose helper for Gemini 3.1 Pro Preview REST calls
//
// Wraps POST https://generativelanguage.googleapis.com/v1beta/models/
//   gemini-3.1-pro-preview:generateContent
//
// Vetted shape (Google docs, May 2026):
//   - Auth via x-goog-api-key HEADER (never ?key= query string — leaks via referrer/logs)
//   - generationConfig.thinkingConfig.thinkingLevel ∈ {"low","medium","high"}
//   - DO NOT pass thinkingBudget alongside thinkingLevel → instant 400
//   - DO NOT override temperature/top_p/top_k — Gemini 3 reasoning optimised for defaults
//
// Usage:
//   import { callGeminiPro } from "../utils/geminiProRest.js";
//   const { text, usage } = await callGeminiPro({
//     prompt: "Why is the sky blue?",
//     systemInstruction: "Be concise.",
//     thinkingLevel: "high",
//   });

const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent";

const VALID_THINKING_LEVELS = new Set(["low", "medium", "high"]);

/**
 * Call Gemini 3.1 Pro Preview via REST with deep-thinking enabled.
 *
 * @param {object}  params
 * @param {string}  params.prompt              — User text (required).
 * @param {string} [params.systemInstruction]  — Optional system instruction.
 * @param {"low"|"medium"|"high"} [params.thinkingLevel="high"]
 * @param {number} [params.timeoutMs=60000]    — AbortController timeout.
 * @param {string} [params.apiKey]             — Override; else import.meta.env.VITE_GEMINI_API_KEY.
 * @returns {Promise<{ text: string, usage: object|null, raw: object }>}
 * @throws  {Error} on missing key, timeout, or non-2xx response.
 */
export async function callGeminiPro({
  prompt,
  systemInstruction,
  thinkingLevel = "high",
  timeoutMs = 60000,
  apiKey,
} = {}) {
  if (typeof prompt !== "string" || prompt.length === 0) {
    throw new Error("callGeminiPro: prompt is required (non-empty string)");
  }
  if (!VALID_THINKING_LEVELS.has(thinkingLevel)) {
    throw new Error(
      `callGeminiPro: invalid thinkingLevel "${thinkingLevel}" — must be low|medium|high`,
    );
  }

  const key =
    apiKey ||
    (typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_GEMINI_API_KEY
      : undefined);
  if (!key) {
    throw new Error(
      "callGeminiPro: VITE_GEMINI_API_KEY missing (env not set and no apiKey override)",
    );
  }

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { thinkingConfig: { thinkingLevel } },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error(`callGeminiPro: request aborted after ${timeoutMs}ms`);
    }
    throw new Error(`callGeminiPro: network error — ${err.message}`);
  }
  clearTimeout(timer);

  const raw = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = raw?.error?.message || JSON.stringify(raw).slice(0, 500);
    throw new Error(`callGeminiPro: HTTP ${res.status} — ${detail}`);
  }

  const text =
    raw.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text || "";
  const usage = raw.usageMetadata || null;

  return { text, usage, raw };
}
