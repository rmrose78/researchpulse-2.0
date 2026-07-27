import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Keep this list in sync with ROUTES in scripts/lighthouse-a11y.mjs.
const ROUTES = [
  { path: '/', name: 'trending (home)' },
  { path: '/search', name: 'search' },
  { path: '/reading-list', name: 'reading list' },
  { path: '/how-it-works', name: 'how it works' },
  { path: '/analytics', name: 'analytics' },
] as const

const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']

async function excludeFromAnalytics(page: Page) {
  // Playwright's own runs must not pollute the real /analytics pageview
  // counts — see frontend/src/utils/analytics-exclusion.ts.
  await page.addInitScript(() => {
    window.localStorage.setItem('researchpulse.analytics.excluded', 'true')
  })
}

async function waitForAnimationsToFinish(page: Page) {
  // Scanning mid-animation samples partially-blended colors and produces
  // false contrast violations.
  await page.evaluate(async () => {
    const animations = document.body.getAnimations({ subtree: true })
    await Promise.all(animations.map((animation) => animation.finished))
  })
}

for (const route of ROUTES) {
  test(`${route.name} (${route.path}) has no accessibility violations`, async ({ page }) => {
    await excludeFromAnalytics(page)
    await page.goto(route.path)
    await waitForAnimationsToFinish(page)

    const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze()

    expect(results.violations).toEqual([])
  })
}

test('mobile nav overlay content is reachable and violation-free when open', async ({ page }) => {
  // Regression coverage for the rr-dev bug class: a mobile nav's content not
  // being in a landmark region while open. This project's MobileNav renders
  // its link list inside a Radix Dialog.Content (role="dialog").
  await excludeFromAnalytics(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await waitForAnimationsToFinish(page)

  await page.getByRole('button', { name: /open menu/i }).click()
  await page.getByRole('dialog').waitFor({ state: 'visible' })
  await waitForAnimationsToFinish(page)

  const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze()

  expect(results.violations).toEqual([])
})
