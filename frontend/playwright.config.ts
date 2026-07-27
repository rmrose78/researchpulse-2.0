import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Serial, single-worker: parallel Chrome instances race with the
  // animation-finish waits in a11y.spec.ts under real CPU contention.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    // Only closes the animation-timing gap because this project's animated
    // components (e.g. mobile-nav.module.scss) already gate their
    // transitions/animations behind `@media (prefers-reduced-motion: reduce)`.
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    {
      name: 'chromium',
      // System Chrome, not Playwright's bundled Chromium — the bundled build
      // doesn't support macOS 13.
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
