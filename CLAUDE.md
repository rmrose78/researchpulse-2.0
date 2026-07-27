## Skill Shortcuts
- "write tests for <file>" → read .claude/skills/pytest-backend.md and write tests for that file
- "fix failing tests" → read .claude/skills/pytest-fix.md and fix failures using TDD

## Commands
- Activate venv: `source backend/venv/bin/activate`
- Start backend: `cd backend && uvicorn app.main:app --reload`
- Run tests: `cd backend && pytest tests/ -v`
- Install dependencies: `cd backend && pip install -r requirements.txt`

## Critical Rules
- Never commit .env
- Routers stay thin — all logic goes in services
- Never write raw SQL — SQLAlchemy only
- All route handlers and service methods must be async
- Tests follow AAA structure
- SCSS modules only on frontend — no inline styles, no Tailwind
- Run tests before every commit
- Pydantic schemas define all request/response shapes
- External API calls go through services — never call them from routers
- Environment variables loaded via pydantic-settings, never hardcoded
- Frontend conventions (component structure, SCSS modules, TypeScript rules,
  folder layout) are canonical in `.claude/skills/4-tdd/fe-standards.md` —
  read that before writing any component, don't duplicate it here

## Collaboration Style

Two modes — pick based on what's being asked.

**Teaching mode** — backend/Python explanations, new concepts, anything learning-related:
- Explain what you're doing and why as you build it — no silent execution
- Use TypeScript analogies for every Python concept (see Developer Context)
- One concept at a time — don't stack explanations
- Lead with the concept name, then one sentence definition, then why it matters
- Side-by-side code comparisons where possible (Python left, TypeScript right)
- Bold the most important word in any explanation
- Flag gotchas explicitly with: ⚠️ GOTCHA:
- Keep prose minimal — bullets over paragraphs
- Never restate what the person already knows

**Quick mode** — everyday snippets, fixes, and frontend work unrelated to learning:
- No conversational filler ("Certainly!", "Here is the code", summaries)
- Plain, direct English — no corporate or academic jargon
- Don't explain obvious logic — only complex algorithmic decisions
- Return only the code, or code + immediate unit tests
- Minimal reproducible snippet for fixes, not the whole file, unless asked
- Long outputs go in an Artifact so they're editable section by section

# CLAUDE.md — ResearchPulse
This file gives Claude Code full context on the ResearchPulse project.
Read this before writing any code or making any decisions.

---

## What This Project Is

ResearchPulse is a full stack biomedical research discovery platform.
Product pitch: "Trending biomedical research, explained in plain English."

Target users: clinicians, health IT analysts, policy professionals —
people who need to act on research, not write it.

---

## Developer Context

- Biomedical engineering degree — domain knowledge is an asset, use it
- 4 years React/TypeScript experience — frontend is comfortable territory
- Learning Python and FastAPI — explain backend concepts clearly
- Explain Python through TypeScript analogies where helpful:
  - Pydantic models ↔ TypeScript interfaces (but runtime enforced)
  - `self` ↔ `this`
  - `__init__` ↔ constructor
  - f-strings ↔ template literals
  - list comprehensions ↔ `.map()`
  - FastAPI routers ↔ Express routers
  - SQLAlchemy models ↔ Entity classes / DTOs

---

## Current Priority
Phase 1 (Core search + reading list) is complete, frontend and backend both.
Phase 2 (Trending) is complete — citation-velocity rankings, all three
ranking modes, the specialty/mode/time-range filter rail, evidence-tier
badges, rank-movement badges, the "why it's trending" + reading-list
citation sync, and sticky specialty/mode selection are all built and merged.

The app is now deployed and live: frontend on Netlify, backend + PostgreSQL
on Railway. Deploy readiness (issue #26) is closed — see
`docs/issues/deployment/0-netlify-railway-deploy-readiness.md` for what
shipped, including DB-connection retry/resilience found necessary during
the live deploy itself. Follow-up: real Alembic migrations before Phase 3
touches the schema (issue #27, still open).

A self-hosted, secret-gated page-view analytics dashboard (issue #35) is
also live at `/analytics` (not linked in nav) — Day/Week/Month/Year/All-time
view counts, top paths, top referrers, reusing the existing Postgres
instance instead of a paid third-party analytics tool. See
`docs/reference/environment.md` for `ANALYTICS_SECRET`.

Fixed (issue #37): rank-movement badges (↑/↓/NEW) had silently stopped
appearing — they need two snapshots per (specialty, mode, window_days) key
to diff against each other, but the only refresh path was reactive to live
traffic, and 72 independent key combinations meant most keys never got
revisited before their cache entry went stale. `app/services/trending_prewarm.py`
now runs on a schedule (`app/main.py` lifespan, every `CACHE_TTL`) to
recompute every combination regardless of traffic, guaranteeing badges
have real data to diff against. Also added a `has_rank_history` field on
`GET /api/trending/` plus a small frontend notice (`rank-history-notice`)
so a combination still building its first comparison reads as "check back
soon" rather than looking broken.

Frontend a11y tooling added (issue #47): `eslint-plugin-jsx-a11y` for
lint-time checks, plus a real-browser sweep (`npm run test:a11y` —
Playwright + `@axe-core/playwright` across all 5 routes and the mobile
nav; `npm run lighthouse:a11y` — accessibility-only Lighthouse audit)
that catches contrast/composition bugs jest-axe structurally can't, since
jsdom doesn't paint or lay out the page. Also added `npm run precommit`
(`build && lint && test`). Wired into
`.claude/skills/4-tdd/pre-commit.md`'s checklist so every future frontend
change is checked automatically, not just this one.

Real contrast failures found the moment that sweep ran (issue #49):
`$clinical-blue` darkened again (`#2973c1` → `#276db7`) — as text on the
`.chip` badge tint, the old value measured 4.19-4.39:1 against real
composited backgrounds, short of WCAG's 4.5:1 minimum, invisible to
jest-axe since jsdom doesn't paint the page. Also added a dedicated
`$clinical-blue-on-dark` token (`#3583d4`) for the nav underline,
focus-visible rings, and the nav logo — `$clinical-blue` is tuned for text
on light backgrounds, so darkening it further (as just happened) would
keep eroding its margin against the navy header; the on-dark variant can
now be tuned independently.

Completed:
- GET /health ✅
- GET /api/search/ ✅
- GET /api/search/{pmid} ✅
- POST /api/reading-list/ ✅
- GET /api/reading-list/ ✅
- DELETE /api/reading-list/{pmid} ✅
- GET /api/reading-list/citations ✅ (live citation counts, best-effort)
- GET /api/trending/ (modes: trending, most_cited, new_notable) ✅
- GET /api/trending/availability ✅
- Trending page: PubMed-style left filter rail (Mode / Specialty / Time
  Range), mobile hamburger nav ✅
- New & Notable evidence-tier badge ✅
- Rank-movement badges (↑/↓/NEW) ✅
- "Why it's trending" line + reading list crossover ✅ (Trending/Most
  Cited fold the detail into the citation-stat line; New & Notable keeps
  a standalone sentence; both handle the age_days === 0 edge case with
  "so far" / "published this month" wording)
- Sticky specialty/mode selection ✅ (persisted to `localStorage`,
  restored on load, URL params take precedence for shareable/bookmarked
  links)
- POST /api/analytics/pageview ✅
- GET /api/analytics/summary ✅ (secret-gated, fails closed)

No open issues in `docs/issues/trending/` — Phase 2 is complete.

---

## Docs

Detail that doesn't need to load into every conversation lives here —
read the relevant one when the task touches it:

- Tech stack + hosting → `docs/reference/tech-stack.md`
- Architecture diagram → `docs/reference/architecture.md`
- Design direction (palette, typography, spacing, component feel) → `docs/reference/design-direction.md`
- API endpoint status → `docs/reference/api-endpoints.md`
- Phases / roadmap → `docs/reference/roadmap.md`
- Environment variables → `docs/reference/environment.md`
- Frontend conventions, SCSS architecture, folder structure → `.claude/skills/4-tdd/fe-standards.md`
- Cross-project handoffs → `docs/handoff/` — check for pending handoff
  docs from sibling projects (e.g. rr-dev) before starting new work. ask me if we should proced with the item or archive for now.
