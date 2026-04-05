// dataIntegrity.js — JARVIS self-healing data integrity system
// WHY: Tests catch bugs before deploy. This catches corruption DURING usage.
// On every boot, JARVIS scans all its data, repairs what it can, and alerts on what it can't.

import { supabase } from './supabase.js'

const PREFIX = 'jos-'

const SCHEMAS = {
  'jos-core': {
    type: 'object',
    required: ['startDate', 'streak', 'rank', 'completedTasks', 'energy'],
    defaults: { startDate: new Date().toISOString(), streak: 0, rank: 'Recruit', completedTasks: [], energy: 3 }
  },
  'jos-feelings': { type: 'array', defaults: [] },
  'jos-concepts': { type: 'array', defaults: [] },
  'jos-achievements': { type: 'array', defaults: [] },
  'jos-journal': { type: 'array', defaults: [], maxLength: 200 },
  'jos-api-logs': { type: 'array', defaults: [], maxLength: 500 },
  'jos-settings': { type: 'object', defaults: { voice: true, sound: true, showMode: false } },
  'jos-weekly': { type: 'object', defaults: {} },
  'jos-interviews': { type: 'array', defaults: [] },
  'jos-commitments': { type: 'array', defaults: [] },
  'jos-morning-bets': { type: 'array', defaults: [] },
  'jos-quick-capture': { type: 'array', defaults: [], maxLength: 500 },
  'jos-daily-build': { type: 'array', defaults: [] },
  'jos-knowledge': { type: 'array', defaults: [], maxLength: 500 },
  'jos-decisions': { type: 'array', defaults: [] },
  'jos-applications': { type: 'array', defaults: [] },
  'jos-battle-plan': { type: 'nullable', defaults: null },
  'jos-onboarding': { type: 'nullable', defaults: null },
  'jos-backup': { type: 'nullable', defaults: null },
  'jos-identity': { type: 'object', defaults: {} },
}

function validateKey(key) {
  const schema = SCHEMAS[key]
  if (!schema) return { valid: true, error: null, value: null }

  try {
    const raw = localStorage.getItem(key)

    if (schema.type === 'nullable') {
      if (raw === null || raw === 'null') return { valid: true, error: null, value: null }
      const parsed = JSON.parse(raw)
      return { valid: true, error: null, value: parsed }
    }

    if (raw === null || raw === 'null' || raw === '') {
      return { valid: false, error: 'missing', value: null }
    }

    let parsed
    try { parsed = JSON.parse(raw) } catch {
      return { valid: false, error: 'corrupted_json', value: null }
    }

    if (schema.type === 'array' && !Array.isArray(parsed)) {
      return { valid: false, error: `expected_array_got_${typeof parsed}`, value: parsed }
    }
    if (schema.type === 'object' && (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null)) {
      return { valid: false, error: `expected_object_got_${typeof parsed}`, value: parsed }
    }

    if (schema.required && schema.type === 'object') {
      const missing = schema.required.filter(f => !(f in parsed))
      if (missing.length > 0) {
        return { valid: false, error: `missing_fields:${missing.join(',')}`, value: parsed }
      }
    }

    if (schema.maxLength && Array.isArray(parsed) && parsed.length > schema.maxLength * 1.5) {
      return { valid: false, error: `over_cap:${parsed.length}/${schema.maxLength}`, value: parsed }
    }

    return { valid: true, error: null, value: parsed }
  } catch (err) {
    return { valid: false, error: `unexpected:${err.message}`, value: null }
  }
}

async function repairKey(key, schema) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('jarvis_data').select('value').eq('key', key).single()
      if (!error && data?.value !== null && data?.value !== undefined) {
        localStorage.setItem(key, JSON.stringify(data.value))
        console.log(`[Integrity] REPAIRED ${key} from Supabase cloud`)
        return { repaired: true, source: 'supabase', error: null }
      }
    } catch { /* Supabase unavailable */ }
  }

  if (schema?.defaults !== undefined) {
    localStorage.setItem(key, JSON.stringify(schema.defaults))
    console.log(`[Integrity] REPAIRED ${key} with defaults`)
    return { repaired: true, source: 'defaults', error: null }
  }

  console.error(`[Integrity] CANNOT REPAIR ${key}`)
  return { repaired: false, source: 'none', error: 'no_repair_source' }
}

function trimOverCap(key, value, maxLength) {
  if (Array.isArray(value) && value.length > maxLength) {
    const trimmed = value.slice(-maxLength)
    localStorage.setItem(key, JSON.stringify(trimmed))
    console.log(`[Integrity] TRIMMED ${key}: ${value.length} → ${maxLength}`)
    return trimmed
  }
  return value
}

function repairMissingFields(key, value, schema) {
  if (schema.required && schema.defaults) {
    let repaired = false
    const fixed = { ...value }
    schema.required.forEach(field => {
      if (!(field in fixed) && field in schema.defaults) {
        fixed[field] = schema.defaults[field]
        repaired = true
      }
    })
    if (repaired) {
      localStorage.setItem(key, JSON.stringify(fixed))
      console.log(`[Integrity] REPAIRED missing fields in ${key}`)
    }
    return fixed
  }
  return value
}

export async function bootIntegrityScan() {
  console.log('[Integrity] Boot scan starting...')
  const results = {
    totalKeys: 0, validKeys: 0, repairedKeys: 0, failedKeys: 0, trimmedKeys: 0,
    details: [], timestamp: new Date().toISOString(),
  }

  for (const [key, schema] of Object.entries(SCHEMAS)) {
    results.totalKeys++
    const validation = validateKey(key)

    if (validation.valid) {
      results.validKeys++
      if (schema.maxLength && Array.isArray(validation.value) && validation.value.length > schema.maxLength) {
        trimOverCap(key, validation.value, schema.maxLength)
        results.trimmedKeys++
        results.details.push({ key, status: 'trimmed', from: validation.value.length, to: schema.maxLength })
      }
    } else {
      console.warn(`[Integrity] ${key}: ${validation.error}`)

      if (validation.error === 'missing') {
        localStorage.setItem(key, JSON.stringify(schema.defaults))
        results.repairedKeys++
        results.details.push({ key, status: 'repaired', error: validation.error, source: 'defaults' })
      } else if (validation.error === 'corrupted_json') {
        const repair = await repairKey(key, schema)
        if (repair.repaired) { results.repairedKeys++; results.details.push({ key, status: 'repaired', error: validation.error, source: repair.source }) }
        else { results.failedKeys++; results.details.push({ key, status: 'failed', error: validation.error }) }
      } else if (validation.error?.startsWith('missing_fields')) {
        repairMissingFields(key, validation.value, schema)
        results.repairedKeys++
        results.details.push({ key, status: 'repaired', error: validation.error, source: 'field_patch' })
      } else if (validation.error?.startsWith('expected_')) {
        const repair = await repairKey(key, schema)
        if (repair.repaired) { results.repairedKeys++; results.details.push({ key, status: 'repaired', error: validation.error, source: repair.source }) }
        else { results.failedKeys++; results.details.push({ key, status: 'failed', error: validation.error }) }
      } else if (validation.error?.startsWith('over_cap')) {
        trimOverCap(key, validation.value, schema.maxLength)
        results.trimmedKeys++
        results.details.push({ key, status: 'trimmed', error: validation.error })
      } else {
        const repair = await repairKey(key, schema)
        if (repair.repaired) { results.repairedKeys++; results.details.push({ key, status: 'repaired', error: validation.error, source: repair.source }) }
        else { results.failedKeys++; results.details.push({ key, status: 'failed', error: validation.error }) }
      }
    }
  }

  // Storage usage
  let totalBytes = 0
  for (const key in localStorage) {
    if (key.startsWith(PREFIX)) totalBytes += (localStorage.getItem(key)?.length || 0) * 2
  }
  results.storageMB = (totalBytes / (1024 * 1024)).toFixed(2)

  // Data hash for tamper detection
  results.dataHash = await generateDataHash()

  try { localStorage.setItem('jos-integrity-scan', JSON.stringify(results)) } catch { /* ok */ }

  const status = results.failedKeys > 0 ? 'ISSUES' : results.repairedKeys > 0 ? 'REPAIRED' : 'HEALTHY'
  console.log(`[Integrity] ${status} — ${results.validKeys}/${results.totalKeys} valid, ${results.repairedKeys} repaired, ${results.failedKeys} failed, ${results.storageMB}MB used`)

  return results
}

export function verifyWrite(key, expectedValue) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return false
    const actual = JSON.parse(raw)
    const expected = typeof expectedValue === 'string' ? JSON.parse(expectedValue) : expectedValue
    return JSON.stringify(actual) === JSON.stringify(expected)
  } catch { return false }
}

async function generateDataHash() {
  try {
    const allData = {}
    Object.keys(SCHEMAS).forEach(key => { allData[key] = localStorage.getItem(key) || 'null' })
    const str = JSON.stringify(allData)
    if (typeof crypto !== 'undefined' && crypto?.subtle) {
      const buffer = new TextEncoder().encode(str)
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
    }
    let hash = 0
    for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash }
    return Math.abs(hash).toString(16)
  } catch { return 'hash-error' }
}

export async function checkTamper() {
  try {
    const lastScan = JSON.parse(localStorage.getItem('jos-integrity-scan') || '{}')
    if (!lastScan.dataHash) return { tampered: false, reason: 'no_baseline' }
    const currentHash = await generateDataHash()
    if (currentHash === lastScan.dataHash) return { tampered: false, reason: 'hash_match' }
    const lastScanTime = new Date(lastScan.timestamp).getTime()
    const apiLogs = JSON.parse(localStorage.getItem('jos-api-logs') || '[]')
    const recentWrites = apiLogs.filter(l => new Date(l.timestamp).getTime() > lastScanTime)
    if (recentWrites.length > 0) return { tampered: false, reason: 'normal_writes', writeCount: recentWrites.length }
    console.warn('[Integrity] DATA TAMPER DETECTED — hash changed without JARVIS writes')
    return { tampered: true, reason: 'hash_mismatch_no_writes' }
  } catch { return { tampered: false, reason: 'check_error' } }
}

export function getDataHealth() {
  try {
    const scan = JSON.parse(localStorage.getItem('jos-integrity-scan') || '{}')
    let totalBytes = 0, keyCount = 0
    for (const key in localStorage) {
      if (key.startsWith(PREFIX)) { totalBytes += (localStorage.getItem(key)?.length || 0) * 2; keyCount++ }
    }
    return {
      keysTotal: keyCount,
      keysValid: scan.validKeys || keyCount,
      keysRepaired: scan.repairedKeys || 0,
      keysFailed: scan.failedKeys || 0,
      storageMB: (totalBytes / (1024 * 1024)).toFixed(2),
      storagePercent: ((totalBytes / (5 * 1024 * 1024)) * 100).toFixed(1),
      lastScan: scan.timestamp || null,
      status: (scan.failedKeys || 0) > 0 ? 'warning' : 'healthy',
    }
  } catch { return { status: 'error', keysTotal: 0, storageMB: '0', storagePercent: '0' } }
}

/**
 * runSystemDiagnostics — JARVIS tests ALL its own systems on every boot
 */
export async function runSystemDiagnostics() {
  const report = {
    timestamp: new Date().toISOString(),
    checks: [],
    status: 'OPERATIONAL',
  }

  // CHECK 1: Data Integrity
  try {
    const scan = await bootIntegrityScan()
    report.checks.push({
      name: 'Data', icon: scan.failedKeys === 0 ? '✅' : '⚠️',
      status: scan.failedKeys === 0 ? 'ok' : scan.repairedKeys > 0 ? 'repaired' : 'failed',
      detail: `${scan.validKeys + scan.repairedKeys}/${scan.totalKeys} keys valid (${scan.storageMB}MB)`,
    })
  } catch {
    report.checks.push({ name: 'Data', status: 'failed', detail: 'Scan crashed', icon: '❌' })
  }

  // CHECK 2: API Connectivity
  try {
    const start = Date.now()
    const resp = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
    })
    const latency = Date.now() - start
    if (resp.ok || resp.status === 400) {
      report.checks.push({ name: 'API', status: 'ok', detail: `Claude reachable (${latency}ms)`, icon: '✅' })
    } else if (resp.status === 401) {
      report.checks.push({ name: 'API', status: 'warning', detail: `API key invalid (${resp.status})`, icon: '⚠️' })
    } else {
      report.checks.push({ name: 'API', status: 'warning', detail: `Claude returned ${resp.status} (${latency}ms)`, icon: '⚠️' })
    }
  } catch (err) {
    report.checks.push({ name: 'API', status: 'failed', detail: `Unreachable: ${err.message}`, icon: '❌' })
  }

  // CHECK 3: Supabase Cloud Sync
  try {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (url && key) {
      const resp = await fetch(`${url}/rest/v1/jarvis_data?select=key&limit=1`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
      })
      report.checks.push({
        name: 'Cloud', icon: resp.ok ? '✅' : '⚠️',
        status: resp.ok ? 'ok' : 'warning',
        detail: resp.ok ? 'Supabase connected' : `Supabase ${resp.status}`,
      })
    } else {
      report.checks.push({ name: 'Cloud', status: 'skipped', detail: 'Not configured', icon: '⏭️' })
    }
  } catch {
    report.checks.push({ name: 'Cloud', status: 'failed', detail: 'Supabase unreachable', icon: '❌' })
  }

  // CHECK 4: Voice System (mic permission)
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const permStatus = await navigator.permissions.query({ name: 'microphone' })
      const map = { granted: ['ok', '✅', 'Mic granted'], prompt: ['warning', '⚠️', 'Mic not yet granted'], denied: ['failed', '❌', 'Mic denied'] }
      const [s, i, d] = map[permStatus.state] || ['warning', '⚠️', permStatus.state]
      report.checks.push({ name: 'Voice', status: s, detail: d, icon: i })
    } else {
      report.checks.push({ name: 'Voice', status: 'failed', detail: 'No mic API', icon: '❌' })
    }
  } catch {
    report.checks.push({ name: 'Voice', status: 'warning', detail: 'Cannot check mic', icon: '⚠️' })
  }

  // CHECK 5: localStorage Quota
  try {
    let totalBytes = 0
    for (const key in localStorage) {
      if (key.startsWith('jos-')) totalBytes += (localStorage.getItem(key)?.length || 0) * 2
    }
    const pct = ((totalBytes / (5 * 1024 * 1024)) * 100).toFixed(1)
    const mb = (totalBytes / (1024 * 1024)).toFixed(2)
    report.checks.push({
      name: 'Storage', icon: parseFloat(pct) > 80 ? '⚠️' : '✅',
      status: parseFloat(pct) > 80 ? 'warning' : 'ok',
      detail: `${mb}MB used (${pct}%)`,
    })
  } catch {
    report.checks.push({ name: 'Storage', status: 'failed', detail: 'Cannot read', icon: '❌' })
  }

  // CHECK 6: Gemini Voice
  try {
    const gKey = import.meta.env.VITE_GEMINI_API_KEY
      || JSON.parse(localStorage.getItem('jos-settings') || '{}').geminiApiKey
    report.checks.push({
      name: 'Gemini Voice', icon: gKey ? '✅' : '⏭️',
      status: gKey ? 'ok' : 'skipped',
      detail: gKey ? 'API key configured' : 'No API key — voice unavailable',
    })
  } catch {
    report.checks.push({ name: 'Gemini Voice', status: 'skipped', detail: 'Not configured', icon: '⏭️' })
  }

  // CHECK 8: Sentry
  try {
    const dsn = import.meta.env.VITE_SENTRY_DSN
    report.checks.push({
      name: 'Sentry', icon: dsn ? '✅' : '⏭️',
      status: dsn ? 'ok' : 'skipped',
      detail: dsn ? 'Error monitoring active' : 'Not configured',
    })
  } catch {
    report.checks.push({ name: 'Sentry', status: 'skipped', detail: 'Not configured', icon: '⏭️' })
  }

  // Overall status
  const failed = report.checks.filter(c => c.status === 'failed').length
  const warnings = report.checks.filter(c => c.status === 'warning').length
  if (failed >= 2) report.status = 'CRITICAL'
  else if (failed >= 1 || warnings >= 3) report.status = 'DEGRADED'
  else report.status = 'OPERATIONAL'

  // Console output
  console.log('%c[JARVIS] SYSTEMS CHECK:', 'color: #00b4d8; font-weight: bold')
  report.checks.forEach(c => console.log(`  ${c.icon} ${c.name}: ${c.detail}`))
  const sc = { OPERATIONAL: 'color: #10b981', DEGRADED: 'color: #d4a853', CRITICAL: 'color: #ef4444' }
  console.log(`%c  STATUS: ${report.status}`, sc[report.status] || '')

  try { localStorage.setItem('jos-diagnostics', JSON.stringify(report)) } catch { /* ok */ }
  return report
}
