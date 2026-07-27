# Pre-Commit Checklist

Run through every item before committing. Do not commit if any item fails.

## All Changes
- [ ] Tests pass — `pytest tests/ -v` (backend)
- [ ] For frontend changes: run these checks in parallel (one message,
      multiple Task/subagent calls) since they're independent of each other —
      then merge all results into one pass/fail report before continuing:
      1. `npm run build` (catches TypeScript errors `npm test` won't —
         e.g. stray/stale files with outdated prop types)
      2. `npm test` (jest + jest-axe, jsdom)
      3. `npm run lint` (includes `eslint-plugin-jsx-a11y` — catches
         keyboard/semantics violations before a browser is even involved,
         e.g. a clickable `div` with no keyboard handler)
- [ ] visual-verification.md already ran earlier in the tdd flow (step 8) —
      don't re-run a Playwright browser audit here, it's the same routes,
      same accessibility-tree snapshot, and same console messages already
      captured there
- [ ] No console errors or warnings (from the console messages captured
      during visual-verification.md)
- [ ] .env not staged — run `git status` and confirm
- [ ] `CLAUDE.md`, `docs/reference/*.md`, and `README.md` reflect this
      issue's outcome — update "Current Priority" (CLAUDE.md), the
      endpoint list (`docs/reference/api-endpoints.md` + README), and the
      feature/roadmap list (`docs/reference/roadmap.md` + README) if this
      issue added, changed, or closed out anything they currently
      describe. Skip if nothing in those docs is now stale — don't edit
      just to edit

## Backend Only
- [ ] New endpoints have tests
- [ ] Tests follow AAA structure
- [ ] Red-green verified — test was seen failing before passing
- [ ] No raw SQL — SQLAlchemy only
- [ ] Router is thin — logic is in service not router

## Frontend Only
- [ ] a11y-checklist.md completed — all items pass
- [ ] Every new component with rendered markup has a jest-axe test (`expect(await axe(container)).toHaveNoViolations()`), with one axe assertion per meaningfully distinct render state (loading, empty, error, success, expanded/collapsed, etc.) — not just the default render
- [ ] `npm run test:a11y` (real-browser Playwright + axe sweep) passes —
      required, not optional, for any frontend change. jest-axe runs in
      jsdom, which doesn't paint or lay out the page, so it structurally
      cannot catch real contrast failures or whole-page composition bugs
      (duplicate ids, landmark conflicts, heading-hierarchy breaks across
      sections) — this is the only thing in the flow that actually can.
      `npm run lighthouse:a11y` is available as a periodic/on-demand
      second opinion but is not a required pre-commit gate. If you do run
      it: always pass `-- --no-view` — `--view` (auto-opening each report
      in the browser) is only useful for a developer running it by hand,
      not an unattended check. It also takes roughly a minute (real Chrome
      launch + full audit per route) — delegate it to a subagent rather
      than blocking on it directly
- [ ] Developer confirmed visual verification
- [ ] SCSS module exists for every new component
- [ ] No inline styles
- [ ] No Tailwind classes
- [ ] No `any` in TypeScript
- [ ] All async states handled — loading, empty, error, success
- [ ] Framer Motion variants defined outside components
- [ ] `prefers-reduced-motion` respected on all animations
- [ ] API calls go through `src/utils/api.ts` — no direct fetch in components

## Git
- [ ] Commit message follows format:
      `feat: <what>` or `fix: <what>` or `chore: <what>`
- [ ] Only files related to this issue are staged
- [ ] Branch is up to date with main
- [ ] After the commit lands, push and open a PR, then open it in the
      browser for review — this is not optional and does not wait to be
      asked:
      1. `git push -u origin <branch>`
      2. `gh pr create` — for issue-driven work: title matching the commit
         prefix (`feat:`/`fix:`/`chore:`), body with `## Summary`,
         `## Test plan`, `Closes #<issue-number>`, and the Claude Code
         footer. For non-issue work (no GitHub issue backing it): same
         format but `## Problem` / `## Fix` instead of `## Summary`, no
         `Closes #N`
      3. `gh pr view --web` — opens the PR in the developer's browser
         automatically, so they can start the code review without asking
      4. Post the "PR ready for review" stop message (see SKILL.md → "When
         Issue is Complete") and stop there — do not continue to other
         work in the same breath
      5. Never run `gh pr merge` or any merge command — merging is always
         manual, no exceptions