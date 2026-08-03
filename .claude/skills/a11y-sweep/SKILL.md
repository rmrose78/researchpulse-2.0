---
name: a11y-sweep
description: Real-browser accessibility sweep (Playwright + axe-core, optional Lighthouse) against the running dev server. Manual/opt-in only — never invoked automatically, always ask before running.
---

# Skill: a11y-sweep

Invoke this only when the developer explicitly runs `/a11y-sweep`, or asks
for an accessibility sweep of the codebase/components. Never run this
automatically or silently — same rule as `visual-verification.md`.

## Why this exists, and why it's separate from jest-axe

`npm test` already runs jest-axe on every component, but that runs under
jsdom, which doesn't paint or lay out the page. Two real gaps that leaves:

- **Color contrast is effectively unchecked by jest-axe.** axe-core's own
  docs say its contrast rule is unreliable under jsdom. This tool runs
  axe-core in a real browser instead, so it reads actually-painted pixels
  — this is what caught the real `$clinical-blue` contrast failure
  (issue #49) jest-axe couldn't see.
- **jest-axe renders one component in isolation per test.** It can't catch
  whole-page composition problems — duplicate ids across two instances of
  a component, landmark/region conflicts, heading-hierarchy breaks across
  sections. This sweep loads the real composed page.

Precondition: dev server running — `cd frontend && npm run dev`
(`http://localhost:5173`). (`npm run test:a11y` will also start it itself
if it isn't already running, via Playwright's `webServer` config.)

## Steps

1. **Run the automated suite**: `npm run test:a11y`. This is
   `@axe-core/playwright` against the real page across all 5 routes and
   the mobile nav open state — the same "one check per meaningfully
   distinct render state" rule this repo already applies to jest-axe.
2. **Report violations** grouped by rule id and impact (critical/serious/
   moderate/minor), with the offending element's selector and the relevant
   WCAG success criterion (axe includes this in each violation's `tags`).
   For each one, give a one-line fix suggestion, not just the raw dump.
3. **If violations show up in only one route/state but not others**,
   suspect a test-timing issue before a real design bug — compute the
   actual CSS-declared contrast for the colors involved and compare
   against what axe reported. A meaningful mismatch usually means axe
   sampled mid-animation or mid-transition; wait for the relevant
   transition/animation to finish
   (`el.getAnimations().map(a => a.finished)`) and re-run before concluding
   it's a real violation.
4. **Optionally run Lighthouse**: `npm run lighthouse:a11y` (dev server
   must already be running — this script doesn't manage its own server
   lifecycle the way the Playwright config does). Report the score and
   flag anything it surfaces that axe didn't (mainly tap-target size and
   viewport meta checks — most of its rule set overlaps axe-core, so don't
   re-report duplicates).
5. **Always remind the developer of what neither tool covers** — pull from
   `.claude/skills/4-tdd/a11y-checklist.md`:
   - Real keyboard tab order across the full page (not just within one
     component)
   - Focus-visible indicator actually rendering correctly
   - Screen-reader announcement quality (aria-live regions, whether
     something makes sense read aloud, not just whether the attribute
     exists)
   - Zoom/text-resize to 200%
   - Any custom drag/interactive widgets needing a keyboard equivalent

## Report format

```
A11Y SWEEP RESULTS

Automated (npm run test:a11y):
- [pass/fail] <route> (mobile)
- [pass/fail] <route> (desktop)
- [pass/fail] mobile nav menu open

Violations found:
- <rule id> (<impact>) — <element> — WCAG <criterion> — <fix suggestion>

Lighthouse (if run): score <n>/100, new findings: <list or "none beyond axe">

Still needs a manual pass (not covered by either tool):
- Keyboard tab order across the full page
- Focus-visible rendering
- Screen-reader announcement quality
- Zoom/text-resize to 200%
- Drag interaction keyboard equivalents (if applicable)
```

## Always

End with the developer confirmation gate before committing any fixes made
in response to this sweep. Never auto-commit.
