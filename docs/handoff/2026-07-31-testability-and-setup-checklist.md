# Handoff: Testability discipline + project-setup checklist (2026-07-31)

## Why this exists

A 2026-07-31 rr-dev session did a retroactive red-green verification sweep
of a coverage-improvement effort and found two things worth generalizing
across all Claude-Code-managed projects:

1. A hook (`useMarquee`'s `autoScroll`/`resumeScroll`) turned out to be
   structurally hard to test, because its state-transition logic and its
   Framer Motion side effects were interleaved rather than separated. That
   wasn't a testing gap that could be fixed after the fact with more effort
   — it was a design choice made at creation time, before anyone was
   thinking about how the feature would eventually be tested.
2. The same session's housekeeping batch (CI, coverage threshold, SEO/OG,
   robots.txt, Dependabot, architecture doc) is exactly the kind of setup
   every project should have from day one, not bolted on after the fact.
   That's now written up as a reusable checklist in the template starter
   repo (`vite-react-ts-starter`), since that's what new projects fork from.

Both changes were ported into `vite-react-ts-starter`'s own CLAUDE.md /
`fe-standards.md`. This doc exists so researchpulse — which predates the
template and already has its own copies of these files — gets the same
updates and gets audited against the checklist, rather than assuming it's
already compliant.

## What's new that this project doesn't have yet

Already done in this repo as part of this same session (not just flagged —
actually applied, since researchpulse shares the exact stack and hook
patterns these changes target):

- Root `CLAUDE.md` Critical Rules: a new bullet stating testability is a
  design constraint on both frontend and backend — keep decision/business
  logic separate from I/O and side effects so it's unit-testable without
  heavy mocking, and flag it to the developer (don't silently work around
  it) if an implementation choice would make something only testable via
  expensive or brittle means.
- `.claude/skills/4-tdd/fe-standards.md`: added a `## Testing` section
  (red-green applies to every test, not just `/4-tdd` builds, including
  tests backfilled onto already-shipped code) and a "Stateful async
  processes" paragraph under Framer Motion (pure state-transition logic
  vs. side-effecting calls — the same pattern rr-dev's `useMarquee` finding
  came from).
- `.claude/skills/pytest-backend/SKILL.md`: added a "Testability Is a
  Design Constraint" section — the backend equivalent of the frontend
  pattern above. Service methods that interleave decision logic with DB
  session calls and external HTTP calls end up only testable by mocking
  three layers deep; the fix is pulling data first (or accepting it as an
  argument) and keeping the actual decision logic callable and assertable
  on its own.

**Update (same day, follow-up session):** the backend testability section
moved out of `pytest-backend/SKILL.md` into a new
`.claude/skills/4-tdd/be-standards.md` — the backend-conventions file this
project was missing (parallel to `fe-standards.md`, which frontend
conventions already pointed at). It now holds the six backend Critical
Rules bullets that used to live inline in CLAUDE.md (thin routers,
SQLAlchemy-only, async, Pydantic schemas, external calls through
services, env vars via pydantic-settings) plus the testability section.
CLAUDE.md's Critical Rules now just points at it, matching the
`fe-standards.md` pattern. `pytest-backend/SKILL.md` keeps a one-line
pointer instead of duplicating the section.

Also added this same session: `a11y-sweep/SKILL.md` (adapted from
rr-dev/vite-react-ts-starter's version, updated to reference this
project's actual 5 routes + mobile nav instead of rr-dev-specific
components), plus a matching Skill Shortcut in CLAUDE.md. And
`claude-md-organizer/SKILL.md` was upgraded with a new Pass 0
("Workflow Completeness Check") that verifies the skill set + CLAUDE.md
skeleton are complete before its existing slim-down pass runs — worth
running here next session, since it wasn't run against this repo yet
(only dogfooded against rr-dev so far).

**Known, deliberately deferred gap**: this repo's `4-tdd/visual-verification.md`
is functionally the same skill as rr-dev/vite-react-ts-starter's
`visual-check/SKILL.md` (no frontmatter, missing the subagent-delegation
efficiency note), but wasn't renamed/restructured this session — it's
cross-referenced by name in multiple places inside this repo's own
`4-tdd/SKILL.md` and `pre-commit.md`, both real per-repo content, so
reconciling the naming carries real coordination risk in a live-traffic
repo for a cosmetic inconsistency. Worth doing deliberately, not as a
drive-by, if picked up next session.

## Project-setup checklist to run through

The full checklist now lives at
`vite-react-ts-starter/docs/reference/project-setup-checklist.md`. Copied
in full below so it's checkable directly in this repo without switching
context. researchpulse predates the template, so treat every item as
unverified until checked, not assumed compliant:

### Repo hygiene
- [ ] `package.json` metadata (name, author, repo/homepage URL) accurate
- [ ] `LICENSE` file present and correct
- [ ] `.env.example` committed with every required variable name (no real
      values); `.env`/`.env.local` gitignored
- [ ] `docs/handoff/` directory present — already true here

### CI and dependency hygiene
- [ ] GitHub Actions workflow running build + lint + test on push/PR to
      main — **confirmed absent** (no `.github/workflows` in this repo)
- [ ] Dependabot config for npm + github-actions, weekly interval —
      **confirmed absent**

### Discoverability
- [ ] README quickstart section: install, env setup, run, deploy
- [ ] `robots.txt` present (skip `sitemap.xml`, low value for this site
      shape) — **confirmed absent**
- [ ] `index.html` meta description, canonical URL, OG title/description/
      image with a real screenshot; skip Twitter/X card tags unless there's
      an actual presence — **confirmed absent** (frontend `index.html` has
      only charset/viewport/title/favicon)

### Testing and accessibility
- [ ] jest-axe on every component with rendered markup, one assertion per
      meaningfully distinct render state
- [ ] Contrast-ratio utility wired against this project's real design
      tokens — worth confirming since the a11y tooling session (issue #49)
      already found and fixed one real contrast failure this way
- [ ] Real-browser a11y sweep + Lighthouse a11y script wired up and
      passing — already present per issue #47/#49 history in CLAUDE.md
- [ ] Testability-first principle called out in this project's own
      CLAUDE.md — **done, see above**
- [ ] Coverage: `collectCoverageFrom` excludes bootstrap/env files;
      `coverageThreshold` set near the real achieved number — **confirmed
      absent**, no coverage config in `frontend/package.json`, no
      `pytest-cov` in backend requirements
- [ ] If a coverage badge exists, it's paired with a real threshold —
      n/a, no badge exists yet

### Documentation
- [ ] Architecture diagram doc — **already present**
      (`docs/reference/architecture.md`)
- [ ] House style rules carried into this project's own CLAUDE.md — this
      repo already has its own Collaboration Style section, distinct from
      rr-dev's, so this is already true by construction

## Where to look

- rr-dev's `fe-standards.md` Testing section + Framer Motion
  "Stateful async processes" paragraph — the exact wording ported here
- rr-dev's `jest.config.js` `coverageThreshold` and
  `scripts/generate-coverage-badge.mjs` — the concrete pattern for a
  coverage badge that's paired with a real gate, if this project adds one
- rr-dev's `.github/workflows/ci.yml` — the CI + coverage-badge-autocommit
  pattern (`stefanzweifel/git-auto-commit-action`, gated to push-to-main
  only, `[skip ci]` to avoid a re-trigger loop)

## Questions for next session in researchpulse

- Frontend: does `fe-standards.md`'s Framer Motion or Testing section
  reveal any existing researchpulse hook with the same mixed pure/
  side-effect design `useMarquee` had in rr-dev? Worth a quick look before
  writing new animation-driven hooks here.
- Backend: is there an existing service method that would benefit from
  the pure-logic/I/O split described in `pytest-backend/SKILL.md`'s new
  section, or is this mostly forward-looking guidance for new code?
- Which of the "confirmed absent" checklist items above are actually worth
  doing for researchpulse specifically (it's a live, deployed, full-stack
  product, not a portfolio) — CI and coverage threshold seem like clear
  yes; SEO/OG and a coverage badge are more debatable for a tool this
  audience finds through search/referral rather than social sharing.
- Adopt the same PR-based batch check-in workflow rr-dev's CLAUDE.md
  documents (create issues up front, branch per issue, commit/push/open
  PR as part of completing each one, merge only on explicit approval)?
  This question carried over from the prior handoff doc
  (`2026-07-24-rr-dev-a11y-tooling.md`) and is still open.
