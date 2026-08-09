---
name: agy-md-organizer
description: Two-pass skill. Pass 0 checks workspace skills and AGY.md completeness; Pass 1 slims AGY.md by relocating reference material to docs/reference/.
---

# Skill: agy-md-organizer

Maintains `AGY.md` and `.agents/skills/` structure to optimize session token efficiency.

---

## Pass 0 — Workflow Completeness Check
Check that `.agents/skills/` contains:
- `1-grill-me/`
- `2-to-prd/`
- `3-to-issues/`
- `4-tdd/` (with `fe-standards.md`, `fe-testing-patterns.md`, `a11y-checklist.md`, `pre-commit.md`)
- `shared/confidence-gate.md`
- `visual-check/`
- `a11y-sweep/`
- `manual-a11y-verification/`
- `agy-md-organizer/`

---

## Pass 1 — Slim AGY.md
Classify sections of `AGY.md`:
- **Keep**: Stack declaration, skill shortcuts, commands, critical rules, priority, docs index.
- **Move to `docs/reference/`**: Tech stack details, design tokens, architecture guides.
- **Delete duplicates**: Sections duplicated verbatim in canonical skill files.
