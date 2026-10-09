# Issue 5: Privacy-Friendly Pageview Analytics Ingestion & Aggregation

## What
Implement `POST /api/analytics/pageview` for lightweight, non-invasive pageview logging and `GET /api/analytics/summary` for aggregating time-window metrics (`today`, `this_week`, `this_month`, `this_year`, `all_time`) with top paths and referrers.

## Why
Provides privacy-friendly site analytics with zero third-party tracking cookies or external scripts, replacing the legacy Python analytics module.

## Acceptance Criteria
- [ ] `POST /api/analytics/pageview` ingests `{ "path": "/trending", "referrer": "..." }` and logs to `page_views` table.
- [ ] Request returns `200 OK` (best-effort fire-and-forget).
- [ ] `GET /api/analytics/summary?key={secret_key}` verifies secret key against `ANALYTICS_SECRET_KEY` config.
- [ ] Returns 5 time-bucket objects (`today`, `this_week`, `this_month`, `this_year`, `all_time`), each containing:
  - `total_views`: integer
  - `top_paths`: array of `{ "path": string, "count": number }`
  - `top_referrers`: array of `{ "referrer": string, "count": number }`
- [ ] Aggregation queries run with optimized indexed lookups on `page_views(viewed_at)`.

## Layers Touched
- [ ] Backend: `backend/src/routes/analytics.rs`, `backend/src/models/analytics.rs`, `backend/src/services/analytics.rs`
- [ ] Migrations: `backend/migrations/0003_create_page_views.sql`
- [ ] Tests: `backend/tests/analytics_test.rs`

## Edge Cases
- Null or empty referrer → normalized to `null` and grouped as `"Direct"`.
- Unauthorized key in `GET /api/analytics/summary` → returns `401 Unauthorized`.
- Massive traffic bursts → non-blocking Tokio spawn prevents logging from slowing down HTTP responses.

## Blocked By
- Issue 2 (SQLx Migrations & Postgres Pool).

## Definition of Done
- [ ] Integration tests verify pageview logging and time-window bucket counts.
- [ ] Response shape matches frontend `AnalyticsSummary` TypeScript interface.
