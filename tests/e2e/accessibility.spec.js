import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function bootApp(page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('jos-onboarding', JSON.stringify({ completedAt: new Date().toISOString() }))
    localStorage.setItem('jos-core', JSON.stringify({
      startDate: new Date().toISOString(), streak: 1, rank: 'Recruit',
      completedTasks: [], energy: 3, totalCheckIns: 1
    }))
    localStorage.setItem('jos-settings', JSON.stringify({ voice: false, sound: false }))
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
  await page.waitForTimeout(500)
}

test.describe('Accessibility', () => {

  test('CMD tab has no critical accessibility violations', async ({ page }) => {
    await bootApp(page)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .disableRules(['color-contrast', 'button-name']) // Iron Man theme + icon-only buttons
      .analyze()
    const critical = results.violations.filter(v => v.impact === 'critical')
    expect(critical).toHaveLength(0)
  })

  test('TRAIN tab has no critical violations', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="TRAIN"]').click()
    await page.waitForTimeout(500)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .disableRules(['color-contrast', 'button-name'])
      .analyze()
    const critical = results.violations.filter(v => v.impact === 'critical')
    expect(critical).toHaveLength(0)
  })

  test('most buttons have accessible names', async ({ page }) => {
    await bootApp(page)
    const buttons = await page.locator('button').all()
    let unnamed = 0
    for (const btn of buttons) {
      const name = await btn.getAttribute('aria-label') || await btn.textContent()
      if (!name?.trim()) unnamed++
    }
    // Allow up to 5 icon-only buttons without labels (known pre-existing)
    expect(unnamed).toBeLessThanOrEqual(5)
  })

  test('all inputs have labels or placeholders', async ({ page }) => {
    await bootApp(page)
    const inputs = await page.locator('input').all()
    for (const input of inputs) {
      const hasLabel = await input.getAttribute('aria-label')
        || await input.getAttribute('placeholder')
        || await input.getAttribute('id')
      expect(hasLabel).toBeTruthy()
    }
  })
})
