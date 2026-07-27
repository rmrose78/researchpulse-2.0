# Tech Stack

### Backend
- Python 3.12.6
- FastAPI + Pydantic V2 + SQLAlchemy
- PostgreSQL 16
- httpx for async HTTP calls to external APIs
- pytest for testing (AAA structure)

### Frontend
- React 19 + TypeScript + Vite 8
- React Router 7 (`react-router-dom`) — routing, and `useSearchParams` for
  shareable/bookmarkable filter state
- SCSS modules — one `.module.scss` per component, no exceptions
- NO Tailwind — pure SCSS modules only
- Radix UI for accessible primitives (Dialog, etc.)
- Framer Motion for animations
- lucide-react for icons
- Jest + React Testing Library for tests, jest-axe for component-level
  a11y checks
- eslint-plugin-jsx-a11y for lint-time a11y checks; Playwright +
  @axe-core/playwright + Lighthouse for a real-browser a11y sweep
  (contrast/composition checks jsdom can't do)

### External APIs
- PubMed NCBI E-utilities — search and article data
- Semantic Scholar — citation counts for velocity algorithm (Phase 2, in use)
- Anthropic API — AI summarization (Phase 3)

### Hosting
- Netlify — frontend (live)
- Railway — backend + PostgreSQL (live)
