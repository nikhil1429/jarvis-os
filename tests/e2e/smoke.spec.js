import { test, expect } from '@playwright/test'

// Shared boot helper — handles full boot flow with voice questions
async function bootApp(page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('jos-onboarding', JSON.stringify({ completedAt: new Date().toISOString() }))
    localStorage.setItem('jos-core', JSON.stringify({
      startDate: new Date().toISOString(), streak: 0, rank: 'Recruit',
      completedTasks: [], energy: 3, totalCheckIns: 1
    }))
    localStorage.setItem('jos-settings', JSON.stringify({ voice: false, sound: false }))
    localStorage.setItem('jos-feelings', '[]')
    localStorage.setItem('jos-concepts', '[]')
    localStorage.setItem('jos-achievements', '[]')
  })
  await page.reload()

  // Phase 4: energy orbs — click "3"
  const energyBtn = page.locator('button:has-text("3")').first()
  await energyBtn.waitFor({ timeout: 50000 })
  await energyBtn.click()

  // Phase 4: focus → skip
  const focusInput = page.locator('input[placeholder*="focus"], input[placeholder*="Type"]')
  await focusInput.waitFor({ timeout: 8000 })
  await focusInput.press('Enter')

  // Phase 4: blockers → skip
  const blockersInput = page.locator('input[placeholder*="Blocker"]')
  await blockersInput.waitFor({ timeout: 8000 })
  await blockersInput.press('Enter')

  // Phase 4: morning bet → skip
  const betInput = page.locator('input[placeholder*="will"]')
  await betInput.waitFor({ timeout: 8000 })
  await betInput.press('Enter')

  // Phase 5-6: briefing → ENTER JARVIS
  const enterBtn = page.locator('button').filter({ hasText: /enter/i }).first()
  await enterBtn.waitFor({ timeout: 50000 })
  await enterBtn.click()

  // Wait for main app
  await page.locator('[aria-label="CMD"]').waitFor({ timeout: 10000 })

  // Dismiss overlays
  await page.waitForTimeout(1000)
  for (let i = 0; i < 3; i++) {
    const xBtn = page.locator('.fixed.inset-0 button:has(.lucide-x), .fixed.inset-0 .lucide-x').first()
    if (await xBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await xBtn.click({ force: true })
      await page.waitForTimeout(300)
    }
  }
  await page.waitForTimeout(500)
}

test.describe('JARVIS OS Smoke Tests', () => {

  test('T1: Fresh start shows onboarding or boot', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      Object.keys(localStorage).forEach(k => { if (k.startsWith('jos-')) localStorage.removeItem(k) })
    })
    await page.reload()
    await page.waitForTimeout(3000)
    const hasMalfunction = await page.locator('text=SYSTEM MALFUNCTION').isVisible().catch(() => false)
    expect(hasMalfunction).toBeFalsy()
  })

  test('T2: Boot sequence completes', async ({ page }) => {
    await bootApp(page)
    await expect(page.locator('[aria-label="CMD"]')).toBeVisible()
  })

  test('T3: CMD tab loads with tasks', async ({ page }) => {
    await bootApp(page)
    await expect(page.locator('text=MISSION TASKS')).toBeVisible({ timeout: 5000 })
  })

  test('T4: TRAIN tab opens and shows modes', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="TRAIN"]').click()
    await expect(page.locator('text=Chat').first()).toBeVisible({ timeout: 3000 })
    await expect(page.locator('text=Quiz').first()).toBeVisible({ timeout: 3000 })
  })

  test('T5: Chat mode opens and accepts text input', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="TRAIN"]').click()
    await page.waitForTimeout(500)
    await page.locator('text=Chat').first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('input[placeholder*="Message"]')).toBeVisible({ timeout: 3000 })
  })

  test('T6: LOG tab loads without crash', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="LOG"]').click()
    await page.waitForTimeout(1000)
    const hasMalfunction = await page.locator('text=SYSTEM MALFUNCTION').isVisible().catch(() => false)
    expect(hasMalfunction).toBeFalsy()
  })

  test('T7: DNA tab shows concepts', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="DNA"]').click()
    await expect(page.locator('text=Prompt Engineering')).toBeVisible({ timeout: 3000 })
  })

  test('T8: STATS tab loads without crash', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="STATS"]').click()
    await page.waitForTimeout(1000)
    const hasMalfunction = await page.locator('text=SYSTEM MALFUNCTION').isVisible().catch(() => false)
    expect(hasMalfunction).toBeFalsy()
  })

  test('T9: WINS tab shows achievements', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="WINS"]').click()
    await expect(page.locator('text=First Blood')).toBeVisible({ timeout: 3000 })
  })

  test('T10: Settings gear opens panel', async ({ page }) => {
    await bootApp(page)
    await page.locator('.lucide-settings').click({ force: true })
    await page.waitForTimeout(500)
    await expect(page.locator('text=ELEVENLABS').first()).toBeVisible({ timeout: 3000 })
  })
})
