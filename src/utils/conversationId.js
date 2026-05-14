// conversationId.js — per-mode conversation UUID + turnIndex (session-scoped)
/**
 * conversationId
 *
 * Layer 1 wiring (Session 81) needs each CHAT_TURN event to reference a stable
 * conversationId and a monotonically increasing turnIndex within that
 * conversation. sessionStorage scope means each browser tab/page-load gets a
 * fresh UUID per mode — which matches the user mental model of "this chat
 * session". A reload starts a new conversation; navigating tabs does not.
 *
 * Bible v4 Block 7 plan: jarvis_conversations table will eventually consume
 * conversationId from event payloads and reconstruct full transcripts. Until
 * that projection exists, conversationId + turnIndex are just opaque correlation
 * keys — but they MUST be stable per session so the projection can run later.
 *
 * Storage shape (sessionStorage key `jos-conversation-ids`):
 *   { [mode]: { id: string, turnIndex: number } }
 */

const STORE_KEY = 'jos-conversation-ids';

function readStore() {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeStore(s) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    /* ok — sessionStorage may be unavailable (private mode, etc.) */
  }
}

function ensureEntry(store, mode) {
  if (!store[mode]) {
    store[mode] = { id: crypto.randomUUID(), turnIndex: 0 };
  }
  return store[mode];
}

/**
 * Get (or create) the conversation UUID for `mode`. Idempotent within a tab.
 * @param {string} mode — training mode key
 * @returns {string} uuid
 */
export function getOrCreateConversationId(mode) {
  const store = readStore();
  const entry = ensureEntry(store, mode);
  writeStore(store);
  return entry.id;
}

/**
 * Return the next turnIndex for `mode` and bump the counter. Each call yields
 * a distinct ordinal — caller should invoke once per emitted event.
 * @param {string} mode
 * @returns {number} 0-based turn index
 */
export function nextTurnIndex(mode) {
  const store = readStore();
  const entry = ensureEntry(store, mode);
  const idx = entry.turnIndex;
  entry.turnIndex = idx + 1;
  writeStore(store);
  return idx;
}
