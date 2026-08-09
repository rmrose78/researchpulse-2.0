---
name: tdd
description: Implement a single issue using TDD. Backend is test-first. Frontend is component-first with red-green verification. Run on one issue at a time.
---

# Skill: tdd

Implement one vertical slice issue at a time. Never move to the next
issue until the current one is visually verified and all tests green.

## Before Starting
1. Read the issue file from `docs/issues/<feature-name>/`
2. Confirm the current branch is specific to this issue (e.g.
   `<issue-number>-<slug>`) — if on `main`, or on a branch for a
   different issue, create/switch to the correct branch before writing
   any code. Never implement an issue directly on `main`
3. If frontend work is involved — read `fe-standards.md` in this directory
4. If committing — run through `pre-commit.md` in this directory

## Rules
- ONE issue per session
- **Never run `git commit` (or stage/commit anything) in this skill, period.**
  Visual confirmation and a passing pre-commit checklist mean the change is
  *ready* to commit, not that it should be committed. Only commit if the
  developer explicitly says so in this session — always end the completion
  report with a "ready for visual check and commit" status instead of
  committing
- Never commit without running pre-commit.md checklist (once the developer
  does ask for a commit)
- Once a commit does happen, push + open a PR + open it in the browser +
  post an explicit "PR ready for review" stop message — see "When Issue is
  Complete" below for the exact message and pre-commit.md for the commands.
  Never auto-merge.
- Act as UI/UX engineer — produce modern, accessible, polished UI
  - When no visual direction is specified beyond
    `docs/reference/design-direction.md`, default to a modern, accessible,
    clinically-credible execution of the existing tokens — don't ask
    permission to apply the established design system
  - If a genuinely distinctive idea occurs to you (an interaction, layout,
    or animation flourish not implied by fe-standards.md or the design
    tokens), pause and describe it to the developer as a proposal before
    building it — don't silently build it, and don't silently skip it either
- Developer is product manager — flag design decisions for approval
- The full completion report in "When Issue is Complete" below is posted
  **once per issue** — when the developer is satisfied and the issue is
  actually done. A bug found mid-stream (during the developer's own visual
  check, a follow-up fix, a scope change) does not get its own report —
  keep working, then fold everything (original criteria, what got added,
  what got fixed) into the one final report. Outside of that final report,
  just say what you did in a sentence or two and move on

---

## Backend Flow — Test First

```
1. RED    — write failing test for ONE criterion
2. VERIFY — run ONLY the targeted test, confirm this test fails
3. GREEN  — write minimum code to pass
4. VERIFY — run ONLY the targeted test, confirm it passes
5. REFACTOR — clean up, targeted test still passes
6. PRE-COMMIT — run the full suite once, then the pre-commit.md checklist
7. CONFIDENCE GATE — shared/confidence-gate.md: confident the implementation
   matches the issue's acceptance criteria?
8. REPORT — output the completion report below and stop. Do not run
   `git commit` — that only happens if the developer explicitly asks.
```

Run the full `pytest tests/ -v` suite only at step 6, before commit — not
on every RED/GREEN iteration. During the loop itself, run just the one
test file/function you're working on (see Backend Commands below).

### Backend Commands
```bash
cd backend && pytest tests/test_<feature>.py::test_<name> -v
cd backend && pytest tests/ -v
```

### Backend Test Pattern
```python
def test_<behavior>_<expected_result>():
    # Arrange
    <set up data>

    # Act
    response = client.<method>(<url>)

    # Assert
    assert response.status_code == <expected>
```

⚠️ If test passes before writing implementation — stop. Test is wrong.

---

## Frontend Flow — Component First

```
1. READ    — read fe-standards.md before writing any component
2. BUILD   — create component following fe-standards.md
3. A11Y    — run through a11y-checklist.md before writing tests
4. TEST    — write test against the real component
5. FORCE RED — break something to confirm test can fail
6. RESTORE — fix back to correct
7. VERIFY GREEN — confirm test passes
8. VISUAL VERIFY — run through visual-verification.md, wait for confirmation
9. PRE-COMMIT — run pre-commit.md checklist
10. CONFIDENCE GATE — shared/confidence-gate.md: confident the implementation
    matches the issue's acceptance criteria? (visual case is already covered
    by visual-verification.md; this catches non-visual gaps)
11. REPORT — output the completion report below and stop. Do not run
    `git commit` — that only happens if the developer explicitly asks.
```

### Frontend Commands
```bash
cd frontend && npm run dev
cd frontend && npm test
cd frontend && npm test -- src/components/<component>.test.tsx
```

### Frontend Test Pattern
```tsx
it('<behavior>', async () => {
    // Arrange
    render(<Component />)

    // Act
    await userEvent.click(screen.getByRole('button', { name: /search/i }))

    // Assert
    expect(await screen.findByText(/results/i)).toBeInTheDocument()
})
```

---

## Visual Verification — Required Before Every Commit

Run through `visual-verification.md` in this directory. If a design
screenshot was provided, it drives an automated screenshot-compare-fix
loop via native Chrome DevTools (CDP) tools; otherwise it falls back to the manual
checklist. Either way, end by waiting for developer confirmation.

---

## Suggested Commit Message Format

This is a suggestion to include in the completion report, not something to
execute — commits happen only when the developer explicitly asks.
```
feat: <what was implemented>

- A11y: <accessibility features added>
- Tests: <what tests verify>
- Visual: developer confirmed
```

## When Issue is Complete

Post this once, when the issue is actually done — not after every
intermediate fix along the way. If the developer finds a bug or asks for a
change mid-stream, just fix it and briefly say what changed; save the full
report for the end.

Before reporting, reconcile scope: if any acceptance criteria were added,
changed, or dropped mid-build (developer feedback, a bug found during
visual verification, a design decision that expanded scope, etc.), update
the issue's markdown file (`docs/issues/<feature>/<n>-<slug>.md`) *and* the
corresponding GitHub issue (`gh issue edit`) so the source of truth matches
what was actually built — never let the report describe scope the issue
file doesn't reflect.

Then output:
```
ISSUE COMPLETE

Issue: <title>
Built: ✅
A11y checked: ✅
Tests: <n> added, all passing ✅
Red-green verified: ✅
Visual confirmed: ✅

Acceptance criteria — original (from the issue as first read):
- [x] <criterion that was met>
- [ ] <criterion NOT met — say why, don't drop it silently>

Acceptance criteria — added during this build:
- <criterion that emerged mid-build, wasn't in the original issue>
  — why: <one-line reason — developer feedback, bug found, scope
  discovered during implementation, etc.>
(state "None — stayed within original scope" if nothing changed)

QA / Product verification checklist:
- [ ] <concrete, testable thing a non-engineer can check in the browser —
  one line per meaningfully distinct behavior or state this issue changed>

Suggested commit message:
<message>

Status: ready for visual check and commit — I have not committed anything.
Let me know when to commit, or commit it yourself.
Next issue: <title or NONE>
```

If the developer authorizes the commit in this session, continue immediately
through push + PR + browser-open (see pre-commit.md → Git section for the
exact commands) and post a second, separate stop message before doing
anything else — including starting a next issue:

```
PR #<n> ready for review: <url>
Opened in your browser for code review.
Not merged — merge is always manual.
```

This second stop is a hard checkpoint on its own — don't fold it into other
narration or bury it mid-message. It does not block *starting* the next
issue's work if the developer says to; it only guarantees the PR-ready
moment itself is never missed.