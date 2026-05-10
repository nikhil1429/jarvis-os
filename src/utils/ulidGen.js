// ulidGen.js — ULID generation + UUID coercion (ULID-as-UUID pattern)
/**
 * ULID-as-UUID pattern (per Bible v4).
 *
 * JARVIS uses ULID semantics — 128-bit identifiers whose first 48 bits are a
 * millisecond timestamp, so IDs sort chronologically and you can recover the
 * creation time without an extra column. But Supabase Postgres PK columns are
 * UUID type. UUID and ULID are both 128-bit values; only the textual encoding
 * differs (UUID = 32 hex chars with dashes; ULID = 26 char Crockford base32).
 *
 * So we generate ULIDs (for chronological sortability + millisecond timestamp
 * embedded in the prefix), then re-encode the same 128 bits as a UUID hex
 * string before sending to Supabase. The bytes are identical — it's purely a
 * presentation conversion. `ulidx` provides both ends of the conversion.
 *
 * Pure functions, no side effects.
 */

import { ulid, ulidToUUID } from 'ulidx';

/**
 * Generate a new ULID string.
 * @returns {string} 26-char Crockford base32 ULID, e.g. "01ARZ3NDEKTSV4RRFFQ69G5FAV"
 */
export function newUlid() {
  return ulid();
}

/**
 * Convert a ULID string to UUID hex format (8-4-4-4-12).
 * @param {string} ulidStr - 26-char Crockford base32 ULID
 * @returns {string} 36-char UUID, e.g. "0162fb16-de37-66bb-89db-7fcd092e3535"
 */
export function ulidToUuid(ulidStr) {
  return ulidToUUID(ulidStr);
}

/**
 * Convenience: generate a new ULID and return it as a UUID-formatted string,
 * ready to send to Supabase as a PK value.
 * @returns {string} UUID string for Postgres `uuid` column
 */
export function newEventId() {
  return ulidToUUID(ulid());
}
