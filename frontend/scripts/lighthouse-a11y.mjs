#!/usr/bin/env node
import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'

// Keep in sync with the ROUTES array in e2e/a11y.spec.ts.
const ROUTES = ['/', '/search', '/reading-list', '/how-it-works', '/analytics']
const PORT = 4174
const BASE_URL = `http://localhost:${PORT}`
const OUT_DIR = 'lighthouse-reports'

function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve, reject) => {
    const attempt = () => {
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() > deadline) reject(new Error(`Server at ${url} did not start in time`))
          else setTimeout(attempt, 500)
        })
    }
    attempt()
  })
}

async function main() {
  // Clear reports from a previous run so removed/renamed routes don't leave
  // stale files behind, and so a crashed/partial run is never mistaken for
  // a fresh one.
  rmSync(OUT_DIR, { recursive: true, force: true })
  mkdirSync(OUT_DIR, { recursive: true })
  const server = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
    stdio: 'inherit',
  })

  try {
    await waitForServer(BASE_URL)
    for (const route of ROUTES) {
      const slug = route === '/' ? 'home' : route.slice(1).replace(/\//g, '-')
      console.log(`Auditing ${route} -> ${OUT_DIR}/${slug}`)
      execFileSync(
        'npx',
        [
          'lighthouse',
          `${BASE_URL}${route}`,
          '--only-categories=accessibility',
          '--output=html',
          '--output=json',
          `--output-path=${OUT_DIR}/${slug}`,
          '--chrome-flags=--headless=new',
          '--view',
          '--quiet',
        ],
        { stdio: 'inherit' }
      )
      console.log(`Done: ${route} -> ${OUT_DIR}/${slug}.report.html (opened in browser)`)
    }
  } finally {
    server.kill()
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
