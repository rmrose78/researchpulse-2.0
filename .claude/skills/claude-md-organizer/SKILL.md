---
name: claude-md-organizer
description: Two-pass skill. Pass 0 checks a project's .claude/skills/ directory and CLAUDE.md skeleton are complete (bootstrapping a new project or filling gaps in an existing one), then Pass 1 slims CLAUDE.md by classifying each section as keep / move-to-docs-reference / delete-as-duplicate. Run after `/init` on a new project, or whenever CLAUDE.md has grown reference material that doesn't need to load into every conversation.
---

# Skill: claude-md-organizer

Two jobs, run in order: first make sure the AI workflow itself (the skill
set + CLAUDE.md's skeleton) is complete, then slim CLAUDE.md down to what's
load-bearing every session. On a project that's already fully set up,
Pass 0 should be a quick no-op check, not busywork — don't manufacture
changes where none are needed.

## Scope: CLAUDE.md Only

This skill governs CLAUDE.md, never README.md. The rationale for pushing
reference material out of CLAUDE.md is per-session token cost — it
reloads in full on every AI conversation. A README doesn't carry that
cost: it's read by humans occasionally, not reloaded into AI context, and
for a solo portfolio project it's the primary surface a hiring manager or
recruiter actually opens. Content that's genuinely evaluator-facing (an
architecture diagram, for instance) belongs directly in the README where
it will actually be seen, not filed away in `docs/reference/` just because
the same "keep it out of CLAUDE.md" instinct also feels applicable there.
Never move, restructure, or thin out README content as a side effect of
running this skill — if a CLAUDE.md section being relocated is also
referenced from or duplicated in the README, leave the README's copy
alone unless the developer separately asks for a README change.

## Pass 0 — Workflow Completeness Check

**Intent**: for a new project, the flow is `/init` → this skill. `/init`
writes a CLAUDE.md from the actual codebase; this pass then makes sure the
standard skill set exists and CLAUDE.md references it correctly. For an
existing project, this pass just fills gaps — it never re-does or
overwrites something that's already there and correct.

### 1. Check the skill set

List `.claude/skills/` and compare against this baseline (name → purpose,
not literal content — every project's version of these legitimately
differs in wording/specifics, that's expected, not drift):

- `1-grill-me/` — pre-code discovery interview
- `2-to-prd/` — turns a discovery interview into a PRD
- `3-to-issues/` — breaks a PRD into vertical-slice GitHub issues
- `4-tdd/` — implements one issue via TDD; must contain `SKILL.md`,
  `fe-standards.md`, `a11y-checklist.md`, `pre-commit.md`, and — only if
  this project has or will have a backend — `be-standards.md`
- `shared/confidence-gate.md` — the confidence-check pattern the pipeline
  skills share
- `manual-a11y-verification/` — portable checklist of what automated a11y
  tooling can't catch
- `visual-check/` — Playwright MCP screenshot-diff loop (opt-in)
- `a11y-sweep/` — real-browser Playwright + axe-core sweep (opt-in)
- `claude-md-organizer/` — this skill
- Only if this project has or will have a backend: a backend
  testing-conventions skill (e.g. `pytest-backend/` or
  `4-tdd/pytest-backend-standards.md`) and a fix-failing-tests skill
  (e.g. `pytest-fix/`)

For anything missing: report it to the developer and ask how they want it
filled — write fresh for this project, or adapt from a reference
implementation they point you to. **Never assume a sibling repo exists at
a fixed path and copy from it silently** — that breaks the moment this
repo is cloned somewhere else, used in CI, or is a genuinely new project
with nothing to copy from yet.

### 2. Check CLAUDE.md's skeleton

Confirm these sections exist (don't touch ones that already do, even if
you'd word them differently):

- Skill Shortcuts, Commands
- Critical Rules, including: a pointer to `fe-standards.md` (and
  `be-standards.md` if this project has a backend), a
  testability-is-a-design-constraint bullet, and the standard pipeline
  reference (`/1-grill-me` → `/2-to-prd` → `/3-to-issues` → `/4-tdd`)
- Collaboration Style
- A Stack Declaration if this project has no backend (or doesn't yet) —
  telling Claude to ignore backend-flavored skill files entirely, so
  tokens aren't spent reading something inert
- Current Priority
- A "## Docs" index linking every skill/reference file mentioned above

Fill in only what's missing, using the project's actual stack/voice —
don't paste boilerplate wholesale. If everything above is already present,
say so explicitly and move straight to Pass 1.

## Pass 1 — Slim CLAUDE.md

CLAUDE.md loads in full on every single conversation. Sections that rarely
change and are only needed for specific tasks (design tokens, environment
variable lists, architecture diagrams) cost tokens every session for no
benefit. This pass keeps CLAUDE.md down to what's load-bearing every time,
and relocates everything else to `docs/reference/`.

### Classification

Read CLAUDE.md top to bottom. For each section, classify it:

**Keep in CLAUDE.md** — needed nearly every session, or changes often
enough that a pointer would go stale:
- Skill Shortcuts, Commands
- Stack Declaration (if present)
- Critical Rules (short, load-bearing bullets)
- Collaboration/communication style
- Current Priority / living status
- Developer/team context that other rules directly depend on (e.g. an
  analogy table a "teaching mode" rule points at — the rule is meaningless
  without it)
- A "## Docs" index linking every relocated file

**Move to `docs/reference/<topic>.md`** — reference material, stable once
written, only needed when a task specifically touches that topic:
- Tech stack / hosting details
- Architecture diagrams
- Design direction / design tokens
- API endpoint status tables
- Roadmap / phases
- Environment variable lists

**Delete outright, replace with a one-line pointer** — content that's
already duplicated verbatim in a more canonical location (a skill's
standards file, a README, etc.). Grep for suspiciously familiar section
content elsewhere in the repo before assuming something is safe to move
rather than delete — duplicated content should point at its canonical
source, not get a second home in docs/reference.

### Process

1. Read CLAUDE.md in full.
2. For each section, propose a classification (keep / move / delete-duplicate)
   with a one-line reason. For delete-duplicate, name the canonical file.
3. Present the proposed split to the developer before moving anything —
   this is a structural change to a file every future session depends on.
4. Once confirmed: create `docs/reference/<topic>.md` for each "move"
   section, verbatim (don't paraphrase or "improve" the content — this is a
   relocation, not a rewrite). If content already looks stale or
   contradicts another section, flag it in the plan rather than silently
   reconciling it — reconciling facts is a product decision, not a filing
   decision.
5. Rewrite CLAUDE.md with only the "keep" sections plus the new "## Docs"
   index pointing at every relocated file and canonical duplicate location.
6. Grep the rest of the repo (skills, docs) for anything that pointed at the
   old CLAUDE.md section by name (e.g. "read CLAUDE.md's Design Direction
   section") and update those references to point at the new location.

## When Done

```
CLAUDE.md ORGANIZED

Pass 0 — Workflow completeness:
  Skills added: <list, or "none needed">
  CLAUDE.md sections added: <list, or "none needed">

Pass 1 — Slim CLAUDE.md:
  Kept: <list of sections retained>
  Moved: <section → docs/reference/file.md>
  Deleted as duplicate: <section → canonical file>
  Cross-references updated: <files>

CLAUDE.md size: <before> lines → <after> lines
```
