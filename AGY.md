# AGY.md — ResearchPulse

This file provides Antigravity (AGY) with full architectural, contextual, and workflow instructions for the ResearchPulse project.
Read this before writing code, running tests, or initiating subagent tasks.

---

## Skill Shortcuts

- `"write tests for <file>"` → read [.agents/skills/pytest-backend/SKILL.md](file:///Users/ryan/Desktop/Development/researchpulse/.agents/skills/pytest-backend/SKILL.md) and write tests for that file
- `"fix failing tests"` → read [.agents/skills/pytest-fix/SKILL.md](file:///Users/ryan/Desktop/Development/researchpulse/.agents/skills/pytest-fix/SKILL.md) and fix failures using TDD
- `"run a11y sweep"` / `"check accessibility violations"` → read [.agents/skills/a11y-sweep/SKILL.md](file:///Users/ryan/Desktop/Development/researchpulse/.agents/skills/a11y-sweep/SKILL.md) via an isolated subagent (`invoke_subagent`)
- `"run visual check"` → read [.agents/skills/visual-check/SKILL.md](file:///Users/ryan/Desktop/Development/researchpulse/.agents/skills/visual-check/SKILL.md) via subagent
- `"grill me"` → read [.agents/skills/1-grill-me/SKILL.md](file:///Users/ryan/Desktop/Development/researchpulse/.agents/skills/1-grill-me/SKILL.md) and conduct interactive Q&A using `ask_question`
- `"convert to prd"` → read [.agents/skills/2-to-prd/SKILL.md](file:///Users/ryan/Desktop/Development/researchpulse/.agents/skills/2-to-prd/SKILL.md)
- `"convert to issues"` → read [.agents/skills/3-to-issues/SKILL.md](file:///Users/ryan/Desktop/Development/researchpulse/.agents/skills/3-to-issues/SKILL.md)
- `"run tdd"` → read [.agents/skills/4-tdd/SKILL.md](file:///Users/ryan/Desktop/Development/researchpulse/.agents/skills/4-tdd/SKILL.md)
- `"organize agy.md"` → read [.agents/skills/agy-md-organizer/SKILL.md](file:///Users/ryan/Desktop/Development/researchpulse/.agents/skills/agy-md-organizer/SKILL.md)

---

## Commands Quick-Reference

### Backend Commands (FastAPI + Python 3.11+ + pytest)
- Activate venv: `source backend/venv/bin/activate`
- Start backend server: `cd backend && uvicorn app.main:app --reload`
- Run full test suite: `cd backend && pytest tests/ -v`
- Run targeted test: `cd backend && pytest tests/test_<feature>.py::test_<name> -v`
- Install dependencies: `cd backend && pip install -r requirements.txt`
- Generate migration: `cd backend && alembic revision --autogenerate -m "<description>"`
- Apply migrations: `cd backend && alembic upgrade head`

### Frontend Commands (React + TypeScript + SCSS Modules + Vite)
- Start dev server: `cd frontend && npm run dev`
- Run unit tests: `cd frontend && npm test`
- Run single test file: `cd frontend && npm test -- src/components/<component>.test.tsx`
- Run browser a11y sweep: `cd frontend && npm run test:a11y` (Playwright + `@axe-core/playwright`)
- Run full precommit pipeline: `cd frontend && npm run precommit` (`build && lint && test`)

---

## Critical Rules & Guidelines

- **Environment & Secrets**: Never commit `.env` or hardcode secrets (`ANALYTICS_SECRET`, database connection strings).
- **Backend Testing & AAA Structure**: Backend unit/integration tests must strictly follow AAA structure with `# Arrange`, `# Act`, `# Assert` comments.
- **Frontend SCSS Architecture & Visual Contrast**:
  - SCSS modules only on frontend — no inline styles, no Tailwind.
  - Always verify parent container background colors before styling text/badges. Never use light text (`$white`, `$gray-300`) on light backgrounds (`#f8fafc`).
  - Hover states (`transform: translateY(...)`) are strictly reserved for clickable buttons, links, and chips — never static display cards.
  - Avoid emoji gimmicks (e.g. 🧬, 💊, 🧠, 💡) in UI labels/buttons. Use clean SVG icons (Lucide) or refined typography for a handcrafted human aesthetic.
  - `jsdom` (Jest) cannot measure composited CSS contrast. Use real browser tools (`npm run test:a11y`, `npm run lighthouse:a11y`, or native Chrome CDP) for visual verification.

- **Canonical Standards**:
  - Frontend conventions (component structure, SCSS modules, TypeScript rules, layout) are canonical in [.agents/skills/4-tdd/fe-standards.md](file:///Users/ryan/Desktop/Development/researchpulse/.agents/skills/4-tdd/fe-standards.md).
  - Backend conventions (thin routers, SQLAlchemy models, async patterns, Pydantic schemas, external API calls) are canonical in [.agents/skills/4-tdd/be-standards.md](file:///Users/ryan/Desktop/Development/researchpulse/.agents/skills/4-tdd/be-standards.md).
- **Testability as a Design Constraint**: Keep decision/business logic separate from I/O and side effects (DB queries, PubMed HTTP calls, timers) on both FE and BE so core logic can be unit-tested without complex 3-layer mocking. Flag brittle test requirements to the developer before building.
- **Git & PR Protocol**:
  - Work on dedicated feature/issue branches (`<issue-number>-<slug>`). Never commit directly to `main`.
  - Never run `git commit` unless explicitly authorized by the developer.
  - After developer approval to commit, run the pre-commit checklist, push to remote, open a PR (`gh pr create`), open it in browser, and post an explicit `"PR ready for review"` stop message. Mechanics are canonical in [.agents/skills/4-tdd/pre-commit.md](file:///Users/ryan/Desktop/Development/researchpulse/.agents/skills/4-tdd/pre-commit.md). Never auto-merge.
- **Writing & Copy Style**: No em dashes in prose, user-facing copy, or commit messages.


---

## Collaboration & Persona Modes

Choose mode based on request type:

### Teaching Mode — Backend, Python, FastAPI & New Concepts
- **Explain rationale**: Explain what you are doing and why as you build it — no silent execution.
- **TypeScript Analogies**: Map Python concepts directly to TypeScript equivalents for fast comprehension:
  - Pydantic models ↔ TypeScript interfaces (runtime enforced)
  - `self` ↔ `this`
  - `__init__` ↔ constructor
  - f-strings ↔ template literals
  - list comprehensions ↔ `.map()`
  - FastAPI routers ↔ Express routers
  - SQLAlchemy models ↔ Entity classes / DTOs
- **One Concept at a Time**: Lead with concept name, one-sentence definition, then why it matters.
- **Visual & Code Comparison**: Side-by-side code comparisons where useful (Python left, TypeScript right).
- **Formatting**: **Bold** key technical terms. Bullet points over long paragraphs.
- **Gotcha Flags**: Explicitly flag Python/FastAPI gotchas with: `⚠️ GOTCHA:`

### Quick Mode — Frontend, Everyday Fixes & Snippets
- **Direct Output**: No conversational filler ("Certainly!", "Here is the code").
- **Plain English**: Direct, clear language without academic jargon.
- **Minimal Snippets**: Return only affected code snippets or code + unit tests, not full files unless requested.
- **Artifact Rendering**: Render long documentation, PRDs, and issue specs as structured user-facing Artifacts.

---

## Antigravity Best Practices & Tooling

- **Interactive Feature Discovery**: Use the `ask_question` tool when grilling or gathering user input instead of dumping multi-choice questions in plain text.
- **Subagent Isolation**: Execute heavy visual screenshot comparisons and accessibility sweeps via native Chrome DevTools (CDP) tools in isolated subagents (`invoke_subagent` with `Model: "flash"`).
- **Background Tasks**: Launch long-running processes or dev servers via `run_command` and monitor without unnecessary polling loops.

---

## What This Project Is

ResearchPulse is a full-stack biomedical research discovery platform.
- **Product Pitch**: *"Trending biomedical research, explained in plain English."*
- **Target Users**: Clinicians, health IT analysts, policy professionals — people who need to act on research, not write it.

---

## Developer Context

- Biomedical engineering degree — domain knowledge is an asset; leverage medical terminology accurately.
- 4 years React/TypeScript experience — frontend is comfortable, high-fluency territory.
- Learning Python and FastAPI — explain backend mechanics clearly through TypeScript analogies.

---

## Current Priority & Architecture Status

Phase 1 (Core search + reading list) and Phase 2 (Trending discovery, rankings, filter rail, evidence badges, rank-movement badges, sticky selections, and pageview analytics) are complete and live.

- **Live Deployment**: Frontend live on Netlify, Backend + PostgreSQL live on Railway.
- **Trending Prewarm Resilience**: `app/services/trending_prewarm.py` runs on a background schedule (`CACHE_TTL`) to prevent badge loss on redeploys. `has_rank_history` flag on `GET /api/trending/` provides UI notices during cold start.
- **Analytics Dashboard**: Secret-gated analytics live at `/analytics` (`ANALYTICS_SECRET`).
- **Accessibility & Design**: WCAG AA contrast compliance verified via `@axe-core/playwright` and `$clinical-blue` (`#276db7`) / `$clinical-blue-on-dark` (`#3583d4`) tokens.
- **Current Next Step**: Implement real Alembic migrations (Issue #27, open) before Phase 3 schema changes.

### Completed Endpoints
- `GET /health` ✅
- `GET /api/search/` ✅
- `GET /api/search/{pmid}` ✅
- `POST /api/reading-list/` ✅
- `GET /api/reading-list/` ✅
- `DELETE /api/reading-list/{pmid}` ✅
- `GET /api/reading-list/citations` ✅ (live citation counts, best-effort)
- `GET /api/trending/` (modes: trending, most_cited, new_notable) ✅
- `GET /api/trending/availability` ✅
- `POST /api/analytics/pageview` ✅
- `GET /api/analytics/summary` ✅ (secret-gated)

---

## Documentation Index

Read relevant docs when tasks touch their specific domains:

- **Tech Stack & Hosting**: [docs/reference/tech-stack.md](file:///Users/ryan/Desktop/Development/researchpulse/docs/reference/tech-stack.md)
- **Architecture Diagram**: [docs/reference/architecture.md](file:///Users/ryan/Desktop/Development/researchpulse/docs/reference/architecture.md)
- **Design System & Tokens**: [docs/reference/design-direction.md](file:///Users/ryan/Desktop/Development/researchpulse/docs/reference/design-direction.md)
- **API Endpoint Status**: [docs/reference/api-endpoints.md](file:///Users/ryan/Desktop/Development/researchpulse/docs/reference/api-endpoints.md)
- **Phases & Roadmap**: [docs/reference/roadmap.md](file:///Users/ryan/Desktop/Development/researchpulse/docs/reference/roadmap.md)
- **Environment Variables**: [docs/reference/environment.md](file:///Users/ryan/Desktop/Development/researchpulse/docs/reference/environment.md)
- **Frontend Standards**: [.agents/skills/4-tdd/fe-standards.md](file:///Users/ryan/Desktop/Development/researchpulse/.agents/skills/4-tdd/fe-standards.md)
- **Backend Standards**: [.agents/skills/4-tdd/be-standards.md](file:///Users/ryan/Desktop/Development/researchpulse/.agents/skills/4-tdd/be-standards.md)
- **Cross-Project Handoffs**: [docs/handoff/](file:///Users/ryan/Desktop/Development/researchpulse/docs/handoff/)
