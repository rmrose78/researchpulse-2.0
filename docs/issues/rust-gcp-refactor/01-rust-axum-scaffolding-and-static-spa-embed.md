# Issue 1: Rust Axum Server Scaffolding & React 19 SPA Embedding

## What
Initialize the Rust workspace, configure Axum with Tokio, implement the `/api/health` healthcheck endpoint, and embed the compiled React 19 frontend (`frontend/dist`) via `rust-embed` with client-side SPA fallback routing.

## Why
Establishes the single-container architecture and verifies that the existing unmodified React 19 frontend runs directly from the Rust binary with zero CORS complexity.

## Acceptance Criteria
- [ ] Root `Cargo.toml` configured with workspace members.
- [ ] `backend/Cargo.toml` configured with Axum, Tokio, Tower, Tracing, `rust-embed`, and `mime_guess`.
- [ ] `GET /api/health` returns `{ "status": "ok", "version": "0.1.0" }` with 200 OK.
- [ ] `GET /` serves `index.html` from `frontend/dist`.
- [ ] Static assets (`.js`, `.css`, SVG, fonts) served with correct MIME types and `Cache-Control` headers.
- [ ] Direct navigation to SPA client-side routes (e.g. `/trending`, `/reading-list`, `/how-it-works`) falls back to `index.html` with 200 OK.
- [ ] Integration tests verify route handling using `tower::ServiceExt`.

## Layers Touched
- [ ] Backend: `backend/src/main.rs`, `backend/src/routes/health.rs`, `backend/src/routes/static_files.rs`
- [ ] Configuration: `Cargo.toml`, `backend/Cargo.toml`, `backend/src/config.rs`
- [ ] Tests: `backend/tests/health_and_static_test.rs`

## Edge Cases
- Missing static file without extension → falls back to `index.html` (SPA routing).
- Missing static file with extension (e.g. `/assets/missing.js`) → returns 404 Not Found rather than HTML.
- Trailing slashes handled consistently.

## Blocked By
- None (Root Issue).

## Definition of Done
- [ ] `cargo check` and `cargo test` pass with zero warnings.
- [ ] `cargo clippy -- -D warnings` passes cleanly.
- [ ] Unmodified React 19 frontend renders in browser when running `cargo run`.
