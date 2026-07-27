# Handoff: rr-dev accessibility tooling (2026-07-24)

## Why this exists

rr-dev (personal portfolio) originally forked its Claude Code workflow and
frontend conventions from this project. During a 2026-07-24 session, rr-dev
built several accessibility tooling improvements that go beyond what this
project's frontend currently has. Cross-reference this if/when any of it is
worth porting here.

## What's new in rr-dev that this project doesn't have yet

Confirmed by checking `frontend/package.json` and `frontend/eslint.config.js`
here before writing this doc: this project already has jest-axe (test-time
a11y checks), but not the items below.

### 1. eslint-plugin-jsx-a11y (lint-time a11y checks)
Catches issues before a test even runs, e.g. a clickable `div` with no
keyboard handler. Needed an `overrides` entry in `package.json` to work
around a peer-dependency range that doesn't support ESLint 10 yet:
```json
"overrides": {
  "eslint-plugin-jsx-a11y": { "eslint": "$eslint" }
}
```
Reference: rr-dev's `eslint.config.js`, `package.json`.

### 2. WCAG contrast-ratio math checker
`src/utils/contrast-ratio.ts` + `src/styles/design-tokens.contrast.test.ts`
compute real WCAG relative-luminance contrast ratios from hex design
tokens and assert 4.5:1 (normal text) / 3:1 (large text/interactive
elements). Not redundant with jest-axe: axe-core's contrast rule is
unreliable under jsdom since jsdom doesn't paint/lay out the page, so
this was the only reliable *automated* contrast check until item 3 below.
It caught and fixed a real WCAG AA failure in rr-dev ($text-muted was
3.49:1, now 5.77:1). Worth running the same method against this project's
own design tokens if they haven't been checked this way.

### 3. Real-browser accessibility sweep (Playwright + axe-core + Lighthouse)
The bigger addition. `npm run test:a11y` (`@axe-core/playwright`,
`e2e/a11y.spec.ts`) plus `npm run lighthouse:a11y`. Closes two gaps
jest-axe structurally can't:
- Contrast checking that actually works (reads real painted pixels, not jsdom)
- Whole-page composition checks. jest-axe only ever renders one component
  in isolation, so it can't catch duplicate ids, landmark conflicts, or
  heading-hierarchy breaks across sections. This sweep caught a real bug
  in rr-dev: a mobile nav menu's content wasn't in a landmark region when
  open, invisible to any component-level test.

Non-obvious gotchas hit while building this (all worth knowing before
porting):
- **macOS 13 compatibility** — Playwright 1.62's bundled Chromium doesn't
  support macOS 13. Use the system Chrome instead: `channel: 'chrome'` in
  `playwright.config.ts`'s project config, not Playwright's own browser
  download.
- **Animation-timing false positives** — scanning mid-animation samples
  partially-blended colors and produces false contrast violations. Fix:
  wait for in-flight animations via
  `el.getAnimations({ subtree: true }).map(a => a.finished)` before
  scanning, and set `use: { contextOptions: { reducedMotion: 'reduce' } }`
  globally in `playwright.config.ts`. That second part only helps if the
  app's own animated components actually read `prefers-reduced-motion` —
  confirm this project's components do before relying on it the same way.
- **Parallel workers race with animation timing** — running several
  Chrome instances in parallel on a dev machine causes real CPU
  contention that delays when animations actually attach, which then
  races with the waits above. Fixed by running the suite serially
  (`fullyParallel: false, workers: 1` in `playwright.config.ts`) — the
  suite is small enough that the speed cost doesn't matter.
- **Needs its own tsconfig** — `e2e/*.spec.ts` files need a dedicated
  tsconfig (`tsconfig.e2e.json`, referenced from the root `tsconfig.json`)
  with `"lib": ["ES2023", "DOM"]`, since Playwright test callbacks
  reference DOM APIs (`Element.getAnimations()`) but a Node-context base
  tsconfig won't have DOM types.
- **Jest needs to ignore the e2e folder** —
  `testPathIgnorePatterns: ['<rootDir>/e2e/']` in `jest.config.js`, or
  Jest tries to run the Playwright spec files itself and fails.

### 4. `npm run precommit` script
`"precommit": "npm run build && npm run lint && npm test"` — the
automated portion of `.claude/skills/4-tdd/pre-commit.md`'s checklist as
one runnable command instead of three manual steps.

### 5. Decision: no accessibility compliance score/badge on the live site
Discussed and rejected showing a "100% Lighthouse" style badge on the
portfolio site itself. A static score is a snapshot that can go stale or
overstate what automated tools actually catch, they only cover a subset
of real accessibility issues, and a wrong public claim is worse than no
claim. Chose to document the testing *practice* instead (rr-dev's README
Accessibility section). Worth the same framing if this project ever
wants to publicly showcase its own a11y work.

### 6. A general CSS/AT gotcha worth remembering
`list-style: none` on a `<ul>`/`<li>` strips list semantics from the
accessibility tree in Safari/VoiceOver unless `role="list"`/
`role="listitem"` are explicit. ESLint's `jsx-a11y/no-redundant-roles`
will flag those roles as redundant since it only checks markup, not this
CSS interaction, so it needs a scoped `eslint-disable` with a comment
explaining why. This showed up as a real (if minor) accessibility
regression in rr-dev's Skills component; worth checking any `list-style:
none` usage here against the same issue.

## Where to look in rr-dev for the actual code
- `playwright.config.ts`, `e2e/a11y.spec.ts` — the sweep itself
- `.claude/skills/a11y-sweep/SKILL.md` — the manual/opt-in skill wrapping it
- `src/utils/contrast-ratio.ts`, `src/styles/design-tokens.contrast.test.ts`
- `tsconfig.jest.json`, `tsconfig.e2e.json` — the tsconfig split pattern

## Questions for next session in researchpulse

Not decided, just flagged for discussion next time this repo is the
active one:

- Port the real-browser axe-core + Lighthouse sweep here?
- Add eslint-plugin-jsx-a11y here?
- Run the same contrast-ratio audit method against this project's own
  design tokens?
- Adopt the same PR-based batch check-in workflow rr-dev's CLAUDE.md now
  documents (create issues up front, branch per issue, commit/push/open
  PR as part of completing each one, merge only on explicit approval)?
  This repo's documented workflow currently stops at commit, issues →
  branch → commit, with no PR step at all.
