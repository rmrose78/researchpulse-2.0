# Issue 2: Serverless Postgres Pool, SQLx Migrations & Reading List CRUD

## What
Configure the SQLx PostgreSQL connection pool optimized for serverless Postgres (Neon / Supabase), run DDL migrations automatically on startup, and implement the Reading List API endpoints.

## Why
Delivers immediate end-to-end user value: saving, retrieving, and removing articles in the reading list with complete database persistence, replacing the legacy Python reading list router.

## Acceptance Criteria
- [ ] SQLx migrations create `saved_articles`, `trending_snapshots`, and `page_views` tables.
- [ ] Connection pool tuned for serverless cold boots (`acquire_timeout`, `max_connections(5)`, `min_connections(0)`).
- [ ] `POST /api/reading-list/` saves article, returning `201 Created` with full `SavedArticle` payload.
- [ ] `POST /api/reading-list/` returns `409 Conflict` on duplicate `pmid` (treated as success by frontend).
- [ ] `GET /api/reading-list/` returns `SavedArticle[]` ordered by `saved_at DESC`.
- [ ] `DELETE /api/reading-list/{pmid}` removes article and returns `204 No Content` (or `404 Not Found`).
- [ ] `GET /api/reading-list/citations` returns `{ "citations": { "<pmid>": <count> } }`.
- [ ] Database integration tests verify concurrent save/delete operations.

## Layers Touched
- [ ] Backend: `backend/src/routes/reading_list.rs`, `backend/src/models/reading_list.rs`, `backend/src/services/reading_list.rs`
- [ ] Migrations: `backend/migrations/0001_create_saved_articles.sql`
- [ ] Tests: `backend/tests/reading_list_test.rs`

## Edge Cases
- Serverless Postgres compute suspended (cold start) → pool retries within 8s acquire timeout without terminating request.
- Duplicate save click → `ON CONFLICT (pmid) DO NOTHING` returns 409 status code cleanly.
- Author list serialization → stored as comma-joined text or JSON string matching frontend expectation.

## Blocked By
- Issue 1 (Rust Axum Scaffolding).

## Definition of Done
- [ ] `cargo test` passes for reading list unit and integration tests.
- [ ] Zero naked `.unwrap()` in route handlers.
- [ ] Exact JSON schema parity verified against frontend `src/types/index.ts`.
