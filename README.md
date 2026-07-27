# ResearchPulse

> Full stack biomedical research discovery platform — actively in development.
> Built with FastAPI, PostgreSQL, and React + TypeScript.

![ResearchPulse demo](docs/media/demo.gif)

## The Problem
PubMed indexes 35+ million biomedical articles. Finding what's actually
relevant is the real challenge. ResearchPulse surfaces trending research
using a citation-velocity ranking algorithm, built for clinicians, health
IT analysts, and policy professionals who need to act on research, not
just find it.

## Status
**Active development** — Phase 1 (Core) complete, Phase 2 (Trending) complete

## Tech Stack
- **Frontend:** React 19 + TypeScript + Vite 8, React Router 7, Radix UI, Framer Motion
- **Backend:** FastAPI + Pydantic V2 + SQLAlchemy
- **Database:** PostgreSQL 16
- **Hosting:** Netlify (frontend) + Railway (backend)
- **External APIs:** PubMed NCBI E-utilities, Semantic Scholar (Phase 2), Anthropic API (Phase 3)

## Features
### Phase 1 — Core (complete)
- Search PubMed by keyword with date and journal filters
- Inline abstract expansion and load-more pagination on search results
- View full article details including MeSH terms and keywords
- Save articles to a personal reading list

### Phase 2 — Trending (complete)
- Citation velocity algorithm to surface trending research
- Three modes, all built: Trending, Most Cited, New & Notable
- Left filter rail for Mode / Specialty / Time Range, with a
  mobile hamburger nav
- Evidence-tier badges (New & Notable) and rank-movement badges (↑/↓/NEW)
- "Why it's trending" plain-English signal on every card — folded into
  the citation-stat line for Trending/Most Cited, a standalone sentence
  for New & Notable
- Reading list shows live re-fetched citation counts, not a stale
  save-time snapshot
- Powered by Semantic Scholar API
- Results cached per specialty/mode/time-window on the backend to minimize
  API calls
- Sticky specialty/mode selection across visits (persisted to
  localStorage; URL params still take precedence for shareable/bookmarked
  links)

### Phase 3 — AI Summarization (planned)
- Plain-English summaries of article abstracts
- Powered by Anthropic API
- Targeted at non-researcher audiences

### Phase 4 — Citation Network (planned)
- Interactive citation graph
- Related articles via react-force-graph or D3.js

## Architecture
React Frontend (Netlify)
↕
FastAPI Backend (Railway)  ←→  PostgreSQL (Railway)
↕
PubMed API + Semantic Scholar API + Anthropic API

## AI-Assisted Development Workflow

This project uses Claude Code CLI with a custom skill workflow modeled
after structured AI engineering practices. Rather than vibe coding,
every feature follows a disciplined pipeline:
/grill-me    → AI interviews developer about feature requirements
before any code is written
/to-prd      → converts interview into a Product Requirements Document
/to-issues   → breaks PRD into vertical slice GitHub Issues
/tdd         → implements each issue using red-green-refactor TDD

**Vertical slices** — each issue cuts through all layers (database,
backend, frontend) and delivers something visible and testable. No
horizontal slicing.

**Custom skills** live in `.claude/skills/` (`1-grill-me`, `2-to-prd`,
`3-to-issues`, `4-tdd`) and are designed to work in air-gapped
environments — plain markdown files with no external dependencies.

## API Endpoints
GET    /health                    — health check
GET    /api/search/               — search PubMed by keyword
GET    /api/search/{pmid}         — get full article detail
POST   /api/reading-list/         — save article to reading list
GET    /api/reading-list/         — get saved articles
DELETE /api/reading-list/{pmid}   — remove saved article
GET    /api/trending/             — trending articles by specialty/mode/window
GET    /api/trending/availability — cache availability for a given filter combo
GET    /api/reading-list/citations — live citation counts for saved articles
POST   /api/analytics/pageview    — anonymous page-view logging
GET    /api/analytics/summary     — Day/Week/Month/Year/All-time view counts
                                     (secret-gated, see docs/reference/environment.md)

## Running Locally

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables
Copy `.env.example` to `.env` in `backend/` and fill in your values:
PUBMED_API_KEY=your_key_here
DATABASE_URL=postgresql://localhost/researchpulse

Full variable list (CORS, analytics secret, etc.) in
`docs/reference/environment.md`.

### Running Tests
```bash
cd backend && pytest tests/ -v
```
```bash
cd frontend
npm test              # jest + jest-axe (component-level a11y)
npm run lint          # includes eslint-plugin-jsx-a11y
npm run test:a11y     # Playwright + axe-core real-browser sweep
npm run lighthouse:a11y  # accessibility-only Lighthouse audit
npm run precommit     # build && lint && test
```

## Accessibility

Three layers, each catching what the others structurally can't:
- **Lint-time** — `eslint-plugin-jsx-a11y` catches keyboard/semantics
  issues before a test even runs (e.g. a clickable `div` with no keyboard
  handler)
- **Component-level** — `jest-axe` runs an axe scan against every
  component's rendered markup in every distinct state (loading, empty,
  error, success)
- **Real-browser** — `jest-axe` runs in jsdom, which doesn't paint or lay
  out the page, so it can't catch real contrast failures or whole-page
  composition bugs (duplicate ids, landmark conflicts, heading-hierarchy
  breaks). A Playwright + `@axe-core/playwright` sweep across every route
  plus Lighthouse fill that gap — and already caught real, shipped
  contrast bugs this way.

No compliance score or badge here — automated tools only catch a subset
of real accessibility issues, and a static score goes stale the moment
something changes. The practice above is what's actually enforced, on
every change, not a number.

## What This Demonstrates
Full stack development, external API integration, PostgreSQL persistence,
an AI-assisted engineering workflow, and domain expertise in biomedical
research.