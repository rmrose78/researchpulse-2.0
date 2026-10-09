# Issue 7: Production Verification, Netlify Cutover & Railway Decommissioning

## What
Execute end-to-end smoke verification against the live Cloud Run deployment, repoint the custom domain / DNS (or Netlify proxy/rewrite) to the new Cloud Run single container, and delete the legacy Railway service to permanently stop monthly hosting billing.

## Why
Completes the full architecture refactor and achieves the primary financial objective: running ResearchPulse with \$0.00/month infrastructure costs perpetually.

## Acceptance Criteria
- [ ] End-to-end smoke tests pass on live Cloud Run production URL:
  - Search query executes and displays articles.
  - Trending articles render with velocity scores and rank movement badges.
  - Bookmarking articles works optimistically and persists across page reloads.
  - Pageview analytics increment properly.
- [ ] Custom domain / DNS or Netlify site configuration updated to route production traffic to Cloud Run.
- [ ] SSL/TLS certificate issued and verified on the custom domain.
- [ ] **Railway Decommissioning**: Legacy Railway service deleted in the Railway dashboard; subscription stopped.
- [ ] Zero recurring monthly hosting bills verified ($0.00/month).

## Layers Touched
- [ ] Infrastructure: Google Cloud Run, Cloud DNS / Domain Registrar, Netlify DNS/Proxy
- [ ] Verification: End-to-end smoke test script and browser verification
- [ ] Legacy Cleanup: Railway service teardown

## Edge Cases
- DNS propagation delay → ensure TTL is set low (300s) prior to migration to minimize cutover downtime.
- Old client caching legacy API URL → single-container deployment serves both frontend and API from same origin, resolving cross-origin path issues.

## Blocked By
- Issue 6 (Docker Containerization & GitLab CI/CD).

## Definition of Done
- [ ] Live domain serves ResearchPulse full-stack from Google Cloud Run.
- [ ] Railway dashboard shows zero active billable services.
- [ ] Final handoff snapshot recorded in `docs/handoff/`.
