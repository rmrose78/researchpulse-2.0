# Session Handoff: ResearchPulse 2.0 (Issues 1-3 Complete -> Ready for Issue 4)

- **Date**: 2026-10-09
- **Pipeline Stage**: /4-tdd (Issues 1, 2, 3 Completed) -> Ready for Issue 4
- **Working Directory**: `/Users/ryan/Desktop/Development/researchpulse-2.0`
- **Git Branch**: `3-ncbi-entrez-client-rate-limiter-and-search`
- **Latest Commit**: `4282351 feat: implement NCBI Entrez client with rate limiting and search route (Issue #3)`
- **Working Tree**: Clean (all changes committed)

---

## 1. Primary Objective
Refactor ResearchPulse into a high-performance, single-container full-stack monorepo in a new standalone directory (`researchpulse-2.0`) featuring a Rust (Axum) backend, embedded React 19 SPA, and serverless Postgres hosted on Google Cloud Run perpetual free tier ($0/mo run-rate), replacing the paid Railway deployment while leaving the original `researchpulse` repository 100% untouched.

## 2. Locked Decisions & Architectural Invariants
- **Original Project Isolation**: `/Users/ryan/Desktop/Development/researchpulse` is untouched on `main`. All 2.0 refactoring lives in `/Users/ryan/Desktop/Development/researchpulse-2.0`.
- **Frontend Preservation**: Zero rewrite of the frontend; `frontend/dist` is embedded into the Rust executable via `rust-embed` with zero CORS issues.
- **Backend Architecture**: Axum + Tokio + Tower in `backend/` with `backend/src/lib.rs` and `backend/src/main.rs`.
- **Database Engine**: Serverless Postgres (Neon / Supabase free tier) using SQLx with compile-time checked queries and auto-migrations on startup (`backend/migrations/`).
- **Connection Pool Tuning**: `acquire_timeout(8s)`, `max_connections(5)`, `min_connections(0)`, `idle_timeout(60s)` for seamless serverless cold boots.
- **NCBI Entrez Rate Limiting**: Token-bucket rate limiter enforcing 3 req/s without key (10 req/s with `NCBI_API_KEY`) and exponential backoff retry on HTTP 429 up to 4 attempts.
- **Search Caching**: Moka in-memory LRU cache with TTL 30 minutes, 1,000 entries.
- **GCP Perpetual Free Tier**: Cloud Run with 256Mi RAM, 1 vCPU, `min_instances = 0`, sub-50ms cold starts, and sub-30MB RAM.
- **Single-Agent Discipline**: Single-agent sequential execution; no subagent swarms.

## 3. Work Completed Across This Session
- [x] Converted `/1-grill-me` discovery into PRD ([docs/prd/rust-gcp-backend-refactor.md](file:///Users/ryan/Desktop/Development/researchpulse-2.0/docs/prd/rust-gcp-backend-refactor.md)) and Senior Dev Implementation Plan ([docs/plans/rust-gcp-backend-refactor.md](file:///Users/ryan/Desktop/Development/researchpulse-2.0/docs/plans/rust-gcp-backend-refactor.md)).
- [x] Generated 7 vertical-slice issue tickets in `docs/issues/rust-gcp-refactor/`.
- [x] Authored turn-key automated GCP setup script ([scripts/setup-gcp.sh](file:///Users/ryan/Desktop/Development/researchpulse-2.0/scripts/setup-gcp.sh)).
- [x] Restored original `researchpulse` repository to 100% untouched status on `main`.
- [x] Cloned and established clean standalone repository at `/Users/ryan/Desktop/Development/researchpulse-2.0`.
- [x] **Issue 1 Complete**: Rust Axum scaffolding, healthcheck (`/api/health`), and embedded static React 19 SPA (`/*`).
- [x] **Issue 2 Complete**: Serverless Postgres pool, SQLx migrations, and Reading List CRUD (`GET`, `POST`, `DELETE`, `/citations`).
- [x] **Issue 3 Complete**: NCBI Entrez client, token-bucket rate limiter, streaming XML parser, Moka LRU cache, and Search route (`GET /api/search/`).
- [x] Verified Red-Green TDD discipline on all 3 completed issues.
- [x] 100% test pass rate (10/10 integration tests passing across workspace in 0.40s).
- [x] Zero warnings on `cargo fmt --check` and `cargo clippy -- -D warnings`.

## 4. Active Artifacts & Documentation Manifest
- **Active PRD**: [docs/prd/rust-gcp-backend-refactor.md](file:///Users/ryan/Desktop/Development/researchpulse-2.0/docs/prd/rust-gcp-backend-refactor.md)
- **Active Implementation Plan**: [docs/plans/rust-gcp-backend-refactor.md](file:///Users/ryan/Desktop/Development/researchpulse-2.0/docs/plans/rust-gcp-backend-refactor.md)
- **Next Issue Spec**: [docs/issues/rust-gcp-refactor/04-semantic-scholar-client-and-trending-engine.md](file:///Users/ryan/Desktop/Development/researchpulse-2.0/docs/issues/rust-gcp-refactor/04-semantic-scholar-client-and-trending-engine.md)
- **Remaining Issues**:
  - Issue 4: Semantic Scholar Batch Client & Trending Ranking Engine
  - Issue 5: Privacy-Friendly Pageview Analytics Ingestion & Aggregation
  - Issue 6: Multi-Stage Alpine Docker Build & GitLab CI/CD with GCP WIF
  - Issue 7: Production Verification, Netlify Cutover & Railway Decommissioning

## 5. In-Flight Slice (Active State)
- **Active Task**: Issues 1, 2, and 3 are 100% complete and committed. Next immediate task is creating branch `4-semantic-scholar-client-and-trending-engine` and implementing Issue 4.
- **Current Verification State**: 10 tests passing, working tree clean, ready to launch Issue 4.

## 6. Blockers & Open Decisions
- NONE.

## 7. Key File Manifest (Pointers Only)
- [backend/src/main.rs](file:///Users/ryan/Desktop/Development/researchpulse-2.0/backend/src/main.rs): Axum HTTP entrypoint.
- [backend/src/routes/reading_list.rs](file:///Users/ryan/Desktop/Development/researchpulse-2.0/backend/src/routes/reading_list.rs): Reading List CRUD.
- [backend/src/routes/search.rs](file:///Users/ryan/Desktop/Development/researchpulse-2.0/backend/src/routes/search.rs): Search route handler with Moka cache.
- [backend/src/services/entrez.rs](file:///Users/ryan/Desktop/Development/researchpulse-2.0/backend/src/services/entrez.rs): NCBI Entrez client & XML parser.
- [backend/src/rate_limiter.rs](file:///Users/ryan/Desktop/Development/researchpulse-2.0/backend/src/rate_limiter.rs): Token bucket rate limiter.
- [scripts/setup-gcp.sh](file:///Users/ryan/Desktop/Development/researchpulse-2.0/scripts/setup-gcp.sh): Automated GCP setup script.
- [legacy_backend/app/services/trending.py](file:///Users/ryan/Desktop/Development/researchpulse-2.0/legacy_backend/app/services/trending.py): Reference logic for Issue 4 trending scoring.
- [legacy_backend/app/services/semantic_scholar.py](file:///Users/ryan/Desktop/Development/researchpulse-2.0/legacy_backend/app/services/semantic_scholar.py): Reference logic for Issue 4 batch citation lookup.

---

## 8. Next Session Resumption Prompt
Copy and paste this into a fresh Antigravity session to resume immediately with zero context waste:

```
Resume work from docs/handoff/2026-10-09-researchpulse-2.0-session-handoff.md. Run /grab-handoff in researchpulse-2.0 and launch Issue 4 (Semantic Scholar Client & Trending Ranking Engine).
```
