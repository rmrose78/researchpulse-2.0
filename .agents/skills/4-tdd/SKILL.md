---
name: 4-tdd
description: Implement one vertical-slice issue at a time using component-first TDD red-green discipline, background test execution, and accessibility verification.
---

# Skill: 4-tdd

Implement one vertical slice issue at a time. Never proceed to the next issue until the current one has passing unit tests, jest-axe compliance, and developer sign-off.

---

## Pre-Implementation Workflow
1. **Read `AGY.md` stack declaration**: Confirm frontend-only rules.
2. **Branch Check**: Switch to branch `<issue-number>-<slug>` created via `gh issue develop`.
3. **Read Standards**: Read `.agents/skills/4-tdd/fe-standards.md` before writing components.
4. **Confidence Check**: Run `.agents/skills/shared/confidence-gate.md` to confirm 95%+ confidence on definition of done.

---

## Frontend TDD Cycle (Component-First + Testability Architecture)

```
1. READ       — Inspect fe-standards.md & fe-testing-patterns.md
2. ARCHITECT  — Extract pure logic into src/utils/*.ts & custom hooks src/hooks/*.ts for 100% testability
3. BUILD      — Create presentational TSX component & SCSS module (*.module.scss)
4. A11Y       — Apply a11y-checklist.md rules (roles, contrast, labels)
5. TEST       — Write Jest/Vitest + RTL + jest-axe tests for hooks, utils, and render states
6. FORCE RED  — Intentionally break component logic to confirm test fails
7. RESTORE    — Fix component back to green
8. VERIFY     — Run `npm test -- --coverage src/components/<component>.test.tsx` (Confirm near 100% coverage)
9. SWARM A11Y — Automatically invoke /a11y-sweep subagent via native AGY Chrome browser tools
10. SWARM VIS  — Automatically invoke /visual-check subagent via native AGY Chrome CDP screenshot tools
11. PRECOMMIT — Automatically execute full pre-commit gate (`npm run precommit` / pre-commit.md)
12. REPORT    — Output completion report with visual, accessibility, and code coverage metrics
```

---

## Parallel Subagent Swarm Execution
When `/3-to-issues` flags unblocked parallel issues, launch concurrent subagents using `invoke_subagent`:

```json
{
  "Subagents": [
    {
      "TypeName": "self",
      "Role": "Subagent Swarm A - Header Component",
      "Prompt": "Implement Issue #2 (Header Component) using /4-tdd workflow in workspace 'share'."
    },
    {
      "TypeName": "self",
      "Role": "Subagent Swarm B - Footer Component",
      "Prompt": "Implement Issue #3 (Footer Component) using /4-tdd workflow in workspace 'share'."
    }
  ]
}
```

---

## Test Verification & Automated Pre-Commit Commands
Execute tests using `run_command`:
```bash
npm test -- src/components/<component>.test.tsx
```

Automated Full Pre-Commit Gate (MUST run before issue completion):
```bash
npm run precommit  # Runs npm run build && npm run lint && npm test
```

---

## Automated Verification Gates
- **Real-Browser Accessibility Gate**: Automatically trigger `/a11y-sweep` subagent via native AGY Chrome browser tools upon unit test pass.
- **Visual Verification Gate**: Automatically trigger `/visual-check` subagent via native AGY Chrome CDP screenshot tools upon unit test pass to embed side-by-side screenshot carousels in the completion report.
- **Pre-Commit Automated Gate**: Automatically execute `npm run precommit` (build, lint, test, jest-axe checks, zero console.log) before declaring issue complete.

---

## When Issue is Complete

1. **GitHub PR Creation Gate**:
   - Push feature branch (`git push -u origin <issue-number>-<slug>`).
   - Create Pull Request (`gh pr create`).
   - **STOP IMMEDIATELY**. Never merge PR into `main` unless explicitly instructed by the developer.

2. Reconcile issue markdown spec and output completion report:

```
ISSUE COMPLETE & PR OPENED

Issue: <title>
Branch: <issue-number>-<slug>
Pull Request: <PR URL>
Built: ✅
A11y checked (jest-axe + native AGY Chrome tools): ✅
Tests: <n> added, all passing ✅
Red-green verified: ✅
Visual verification: <confirmed / skipped>
Pre-commit gate (build/lint/test): ✅

Acceptance criteria:
- [x] <criterion met>

QA Verification Checklist:
- [ ] <testable user behavior line 1>
- [ ] <testable user behavior line 2>

Suggested commit message:
feat: <description>

- A11y: <accessibility details>
- Tests: <unit & jest-axe test coverage>

Status: PR opened and ready for developer code review. STOPPED (Awaiting developer instructions to merge).
Next issue: <title or NONE>
```
