# Issue 4: Semantic Scholar Batch Client & Trending Ranking Engine

## What
Build `SemanticScholarClient` for batch citation lookups, the `TrendingEngine` for velocity calculation and evidence-based notability tiering, 90-day time slice sampling, snapshot diffing (`rank_delta`, `is_new`), and the `GET /api/trending/` & `GET /api/trending/availability` endpoints.

## Why
Delivers the core flagship feature of ResearchPulse: discovering trending biomedical research by specialty, evidence tier, and citation velocity, with visible rank-movement badges.

## Acceptance Criteria
- [ ] `SemanticScholarClient` batches up to 200 PMIDs per call via `POST /graph/v1/paper/batch`.
- [ ] Catches HTTP 400 (`"No valid paper ids given"`) safely, returning empty citation map.
- [ ] Velocity computed as `citation_count / (age_in_days + 21)`.
- [ ] Notability tiers mapped from PubMed `PublicationType` (Meta-Analysis / Systematic Review = Tier 1; RCT = Tier 2; Clinical Trial = Tier 3).
- [ ] Rank movements diffed against previous snapshot (`rank_delta`: integer or null, `is_new`: bool).
- [ ] Snapshots persisted to Postgres `trending_snapshots` table and cached in Moka LRU cache (TTL 4 hours).
- [ ] `GET /api/trending/` supports `specialty`, `mode` (`trending`, `most_cited`, `new_notable`), and `window_days` (`60`, `180`, `365`, `730`).
- [ ] `GET /api/trending/availability` returns precomputed status per specialty.

## Layers Touched
- [ ] Backend: `backend/src/services/semantic_scholar.rs`, `backend/src/services/trending.rs`, `backend/src/services/specialties.rs`, `backend/src/routes/trending.rs`, `backend/src/models/trending.rs`
- [ ] Migrations: `backend/migrations/0002_create_trending_snapshots.sql`
- [ ] Tests: `backend/tests/trending_test.rs`

## Edge Cases
- 0-citation articles → excluded in `trending` and `most_cited` modes; included in `new_notable` mode.
- Empty previous snapshot in database → `has_rank_history` set to `false`, `rank_delta` is `null`, `is_new` is `false`.
- Semantic Scholar API rate limits or timeout → serves last good cached snapshot with `computed_at` freshness timestamp.

## Blocked By
- Issue 2 (SQLx Migrations & Postgres Pool)
- Issue 3 (Entrez Client & XML Parser)

## Definition of Done
- [ ] Unit tests verify pure scoring logic and notability sorting.
- [ ] Snapshot diffing unit tests verify positive delta (`+3`), negative delta (`-1`), and `is_new`.
- [ ] `GET /api/trending/` validated against React frontend `useTrending` hook.
