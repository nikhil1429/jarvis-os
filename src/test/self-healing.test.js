import { describe, it, expect, beforeEach } from 'vitest'

describe('Self-Healing: Data Integrity Engine', () => {
  let bootIntegrityScan, verifyWrite, getDataHealth, checkTamper

  beforeEach(async () => {
    localStorage.clear()
    const mod = await import('../utils/dataIntegrity.js')
    bootIntegrityScan = mod.bootIntegrityScan
    verifyWrite = mod.verifyWrite
    getDataHealth = mod.getDataHealth
    checkTamper = mod.checkTamper
  })

  // Boot scan
  it('clean state passes scan', async () => {
    localStorage.setItem('jos-core', JSON.stringify({ startDate: new Date().toISOString(), streak: 0, rank: 'Recruit', completedTasks: [], energy: 3 }))
    localStorage.setItem('jos-feelings', '[]')
    localStorage.setItem('jos-concepts', '[]')
    localStorage.setItem('jos-settings', '{}')
    const r = await bootIntegrityScan()
    expect(r.failedKeys).toBe(0)
  })

  it('corrupted JSON gets repaired', async () => {
    localStorage.setItem('jos-core', 'NOT_VALID{{{JSON')
    const r = await bootIntegrityScan()
    expect(r.repairedKeys).toBeGreaterThan(0)
    expect(() => JSON.parse(localStorage.getItem('jos-core'))).not.toThrow()
  })

  it('missing required fields get patched', async () => {
    localStorage.setItem('jos-core', JSON.stringify({ streak: 5 }))
    await bootIntegrityScan()
    const core = JSON.parse(localStorage.getItem('jos-core'))
    expect(core.rank).toBeTruthy()
    expect(core.energy).toBeDefined()
    expect(core.completedTasks).toBeDefined()
  })

  it('array with wrong type gets reset', async () => {
    localStorage.setItem('jos-feelings', JSON.stringify({ bad: true }))
    await bootIntegrityScan()
    const feelings = JSON.parse(localStorage.getItem('jos-feelings'))
    expect(Array.isArray(feelings)).toBe(true)
  })

  it('over-cap arrays get trimmed', async () => {
    const big = Array.from({ length: 800 }, (_, i) => ({ id: i }))
    localStorage.setItem('jos-api-logs', JSON.stringify(big))
    await bootIntegrityScan()
    const logs = JSON.parse(localStorage.getItem('jos-api-logs'))
    expect(logs.length).toBeLessThanOrEqual(500)
  })

  // Write verification
  it('verifyWrite returns true for valid write', () => {
    const data = { streak: 5 }
    localStorage.setItem('jos-test', JSON.stringify(data))
    expect(verifyWrite('jos-test', data)).toBe(true)
  })

  it('verifyWrite returns false for missing key', () => {
    expect(verifyWrite('jos-nonexistent', { x: 1 })).toBe(false)
  })

  // Data health
  it('getDataHealth returns structured object', () => {
    localStorage.setItem('jos-core', '{}')
    const h = getDataHealth()
    expect(h.status).toBeTruthy()
    expect(h.storageMB).toBeTruthy()
    expect(h.storagePercent).toBeTruthy()
  })

  it('getDataHealth shows low usage with minimal data', () => {
    const h = getDataHealth()
    expect(parseFloat(h.storageMB)).toBeLessThan(1)
  })

  // Tamper detection
  it('checkTamper returns no_baseline on first run', async () => {
    const r = await checkTamper()
    expect(r.tampered).toBe(false)
    expect(r.reason).toBe('no_baseline')
  })

  it('checkTamper detects hash match after scan', async () => {
    localStorage.setItem('jos-core', JSON.stringify({ startDate: new Date().toISOString(), streak: 0, rank: 'Recruit', completedTasks: [], energy: 3 }))
    await bootIntegrityScan()
    const r = await checkTamper()
    expect(r.tampered).toBe(false)
  })
})
