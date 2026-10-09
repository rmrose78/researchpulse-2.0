# Issue 3: NCBI Entrez Client with Rate Limiting & Search Route Parity

## What
Build `EntrezClient` with a token-bucket rate limiter, exponential backoff for HTTP 429 retries, streaming XML parser (`quick-xml`), in-memory Moka search cache, and the `GET /api/search/` route handler.

## Why
Replaces the Python PubMed service with sub-millisecond parsing, in-memory caching, and rock-solid rate-limit compliance to protect against NCBI IP bans while delivering instant search responses.

## Acceptance Criteria
- [ ] Token-bucket rate limiter enforces 3 req/sec without API key (10 req/sec with `NCBI_API_KEY`).
- [ ] On NCBI HTTP 429 response, client backs off exponentially (`0.5s`, `1s`, `2s`, `4s`) up to 4 attempts.
- [ ] Two-step Entrez search: `esearch.fcgi` (retrieve PMIDs & Count) $\to$ `efetch.fcgi` (retrieve XML records).
- [ ] `quick-xml` parses `<PubmedArticle>`, PMIDs, Title, Abstract, Authors, Journal, PubDate, DOI, and PublicationTypes.
- [ ] `GET /api/search/` handles `q`, `max_results`, `offset`, `journal`, `date_from`, `date_to`.
- [ ] Moka LRU cache caches search query results for 30 minutes.
- [ ] Response matches `SearchResponse` schema: `{ "total": <n>, "results": [...], "query": "<q>" }`.

## Layers Touched
- [ ] Backend: `backend/src/services/entrez.rs`, `backend/src/rate_limiter.rs`, `backend/src/routes/search.rs`, `backend/src/models/article.rs`
- [ ] Tests: `backend/tests/search_test.rs`

## Edge Cases
- NCBI responds with empty search results → returns `{ "total": 0, "results": [], "query": "<q>" }`.
- Missing fields in XML (e.g. no abstract or no DOI) → serialized as `null` or empty array matching frontend types.
- Special characters in query strings → URL-encoded properly before calling Entrez API.

## Blocked By
- Issue 1 (Rust Axum Scaffolding).

## Definition of Done
- [ ] Rate limiter verified under concurrent load tests.
- [ ] XML parsing tests verify zero memory leaks and correct author string formatting (`"LastName, ForeName"`).
- [ ] Search endpoint response verified byte-for-byte against frontend search client.
