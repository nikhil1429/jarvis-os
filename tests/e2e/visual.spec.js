import { test, expect } from '@playwright/test'

async function bootApp(page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('jos-onboarding', JSON.stringify({ completedAt: new Date().toISOString() }))
    localStorage.setItem('jos-core', JSON.stringify({
      startDate: new Date(Date.now() - 6 * 86400000).toISOString(),
      streak: 3, rank: 'Recruit', completedTasks: [1,2,3], energy: 4, totalCheckIns: 1
    }))
    localStorage.setItem('jos-settings', JSON.stringify({ voice: false, sound: false }))
    localStorage.setItem('jos-feelings', JSON.stringify([
      { date: new Date().toISOString().split('T')[0], confidence: 4, focus: 3, motivation: 4, mood: 'focused' }
    ]))
  })
  await page.reload()

  const energyBtn = page.locator('button:has-text("3")').first()
  await energyBtn.waitFor({ timeout: 50000 })
  await energyBtn.click()
  const focusInput = page.locator('input[placeholder*="focus"], input[placeholder*="Type"]')
  await focusInput.waitFor({ timeout: 8000 })
  await focusInput.press('Enter')
  const blockersInput = page.locator('input[placeholder*="Blocker"]')
  await blockersInput.waitFor({ timeout: 8000 })
  await blockersInput.press('Enter')
  const betInput = page.locator('input[placeholder*="will"]')
  await betInput.waitFor({ timeout: 8000 })
  await betInput.press('Enter')
  const enterBtn = page.locator('button').filter({ hasText: /enter/i }).first()
  await enterBtn.waitFor({ timeout: 50000 })
  await enterBtn.click()
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
  await page.waitForTimeout(1000) // let animations settle
}

test.describe('Visual Regression — Screenshot Baselines', () => {

  test('CMD tab screenshot', async ({ page }) => {
    await bootApp(page)
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('cmd-tab.png', { maxDiffPixelRatio: 0.05 })
  })

  test('TRAIN tab screenshot', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="TRAIN"]').click()
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('train-tab.png', { maxDiffPixelRatio: 0.05 })
  })

  test('LOG tab screenshot', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="LOG"]').click()
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('log-tab.png', { maxDiffPixelRatio: 0.05 })
  })

  test('DNA tab screenshot', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="DNA"]').click()
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('dna-tab.png', { maxDiffPixelRatio: 0.05 })
  })

  test('STATS tab screenshot', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="STATS"]').click()
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('stats-tab.png', { maxDiffPixelRatio: 0.05 })
  })

  test('WINS tab screenshot', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="WINS"]').click()
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('wins-tab.png', { maxDiffPixelRatio: 0.05 })
  })
})
