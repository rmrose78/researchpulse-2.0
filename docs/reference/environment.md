# Environment Variables

### backend/.env (never commit)
PUBMED_API_KEY=your_key_here
SEMANTIC_SCHOLAR_API_KEY=your_key_here
DATABASE_URL=postgresql://localhost/researchpulse
FRONTEND_URL=http://localhost:5173
ANALYTICS_SECRET=choose_your_own_secret_here

`FRONTEND_URL` sets the allowed CORS origin — the deployed Netlify URL in
production, defaulting to the local Vite dev server otherwise.

`ANALYTICS_SECRET` gates `GET /api/analytics/summary` (the `/analytics`
dashboard page) — pick your own value, keep it out of version control. If
unset, the summary endpoint fails closed (404) regardless of what key is
passed.

Not yet implemented — Phase 3, not read by the app today:
GEMINI_API_KEY=your_key_here
AI_ENABLED=false

### frontend/.env (never commit)
VITE_API_URL=http://localhost:8000

In Netlify's dashboard (Site settings → Environment variables), set
`VITE_API_URL` to the deployed Railway backend URL. This is not a secret.
