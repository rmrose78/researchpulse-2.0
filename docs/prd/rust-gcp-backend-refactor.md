# PRD: Rust & GCP Cloud Run Full-Stack Refactor

## Problem
The current ResearchPulse deployment relies on a Python FastAPI backend hosted on Railway ("railroad") which incurs recurring monthly hosting costs and cold-start/memory overhead. Separately, the frontend is deployed on Netlify. To eliminate monthly hosting bills entirely (\$0 perpetual cost), achieve sub-50ms cold starts, and keep memory consumption under 30MB, the backend will be refactored into a high-performance Rust (Axum) service. The existing React 19 frontend will be reused completely as-is, embedded into a single multi-stage Docker container deployed to Google Cloud Run perpetual free tier, and backed by a serverless PostgreSQL database (Neon or Supabase free tier).

## Success Criteria
- [ ] 100% API contract parity with existing React 19 frontend (zero frontend code rewrites needed).
- [ ] Sub-50ms container cold starts on Google Cloud Run.
- [ ] Backend memory footprint strictly under 30MB during active traffic.
- [ ] Single multi-stage Docker container serving both `/api/*` endpoints and embedded static assets (`/*`) with zero CORS complexity.
- [ ] Persistence managed via SQLx compile-time checked queries against serverless Postgres (Neon / Supabase perpetual free tier) with zero idle database costs.
- [ ] Token-bucket rate limiting (3 req/s without key, 10 req/s with key) protecting NCBI Entrez endpoints.
- [ ] Stale-while-revalidate in-memory caching via `moka` LRU cache for high-velocity trending endpoints.
- [ ] Automated CI/CD deployment via GitLab CI using Google Cloud Workload Identity Federation (WIF) with zero stored static service account keys.
- [ ] 100% compliant with GCP perpetual free tier (Cloud Run 2M requests/mo, 360k GiB-sec/mo, 180k vCPU-sec/mo).
- [ ] Production Cutover: Netlify site switched to the new single-container deployment, and Railway service canceled to stop monthly billing.

## Developer Manual Actions Checklist
These are the manual setup steps required by the developer outside of code generation:

### 1. Google Cloud Platform Setup
- [ ] Select or create GCP Project (e.g. `researchpulse-prod`) with billing enabled (required by GCP to activate perpetual free tier).
- [ ] Enable required APIs:
  ```bash
  gcloud services enable run.googleapis.com artifactregistry.googleapis.com iamcredentials.googleapis.com
  ```
- [ ] Create Artifact Registry Docker repository:
  ```bash
  gcloud artifacts repositories create researchpulse-repo \
      --repository-format=docker \
      --location=us-central1 \
      --description="ResearchPulse Docker images"
  ```
- [ ] Set up Workload Identity Federation (WIF) pool and provider for GitLab CI (or create a deployment service account).

### 2. Serverless Database Provisioning
- [ ] Create a free PostgreSQL instance on Neon (`neon.tech`) or Supabase (`supabase.com`).
- [ ] Copy the pooled connection string (`postgresql://user:pass@host/dbname?sslmode=require`).

### 3. GitLab Repository & CI/CD Secrets
- [ ] Create new GitLab repository (e.g. `gitlab.com/<username>/researchpulse`).
- [ ] Add project CI/CD Variables in GitLab (**Settings > CI/CD > Variables**):
  - `DATABASE_URL`: Connection string for serverless Postgres.
  - `GCP_PROJECT_ID`: GCP project ID.
  - `GCP_SERVICE_ACCOUNT`: Service account email with Cloud Run Developer & Artifact Registry Writer roles.
  - `GCP_WIF_PROVIDER`: Full resource name of the WIF provider.
  - `NCBI_API_KEY`: (Optional) For 10 req/s PubMed Entrez throughput.
  - `SEMANTIC_SCHOLAR_API_KEY`: (Optional) For higher rate limits on citation lookups.

### 4. Verification, Cutover & Cost Elimination
- [ ] Verify live Cloud Run service endpoint (`https://<service-id>-<region>.a.run.app`) and validate search, trending, and reading list features.
- [ ] Point custom domain / DNS to Cloud Run (or configure Netlify domain rewrite/redirect to Cloud Run single container).
- [ ] **Cancel Railway Service**: Once production Cloud Run service is validated, delete the Railway service to stop monthly hosting charges.

## User Stories
- **As a researcher or clinician**, I want instant search results and rapid page loads so I can discover trending biomedical papers without latency.
- **As a user**, I want to save articles to my reading list and retrieve them instantly with up-to-date citation counts.
- **As a system operator/developer**, I want the entire application to run seamlessly within free-tier limits with zero recurring monthly hosting bills.
- **As an engineer**, I want compile-time guarantees on database queries and API types to prevent runtime crashes in production.

## Design Direction & UI Specs
- **Frontend Reuse Strategy**: The existing React 19 / TypeScript / Vite frontend located in `researchpulse/frontend` will be reused directly without re-implementation.
- **Palette & Tokens**: Existing ResearchPulse palette preserved:
  - Primary Background: Deep Navy (`#0A1628`)
  - Content Background: Clean White (`#F8FAFC`)
  - Accent / Links / CTAs: Electric Blue (`#2973C1`)
  - Secondary Text: Slate Gray (`#64748B`)
  - Success: Emerald Green (`#059669`)
  - Error: Coral Red (`#DC2626`)
- **Typography & Scale**: Inter for headings and body copy; JetBrains Mono for PMIDs and DOIs.
- **Interactions**: Debounced search (350ms), optimistic bookmark save/remove with toast notifications, interactive trending filters, and rank delta badges (`+3`, `-1`, `NEW`).
- **Responsive Layout**: Desktop multi-column grid adapting to single-column card stack on mobile viewports.

## User Flow & State Diagram

```mermaid
flowchart TD
    Init[User Visits /] --> CheckRoute{Route Path}
    CheckRoute -->|Static Asset / HTML| AxumStatic[Axum Embedded Static Service]
    CheckRoute -->|/api/*| AxumAPI[Axum API Handler Stack]
    
    AxumStatic --> ReactSPA[React 19 Frontend Initialized]
    
    ReactSPA -->|Query Search /api/search| SearchFlow[PubMed Entrez Proxy + Cache]
    ReactSPA -->|Load Trending /api/trending| TrendingFlow[Cache Check -> Snapshot DB / Calculation Engine]
    ReactSPA -->|Bookmark Article /api/reading-list| BookmarkFlow[SQLx Postgres Mutation]
    ReactSPA -->|Log View /api/analytics| AnalyticsFlow[Async Ingestion Queue]
    
    SearchFlow --> RateLimiter[Token Bucket Rate Limiter 3-10 req/s]
    RateLimiter --> NCBI[NCBI Entrez API]
    
    TrendingFlow --> MokaCache{In-Memory Cache Hit?}
    MokaCache -->|Hit| ReturnFast[Immediate Cached Response]
    MokaCache -->|Miss| FallbackDB{Recent DB Snapshot < 8h?}
    FallbackDB -->|Found| ReturnDB[Return DB Snapshot + Warm Cache]
    FallbackDB -->|Not Found| ComputeTrending[Entrez Query + Semantic Scholar Batch + Scoring Engine]
    ComputeTrending --> SaveSnapshot[Persist TrendingSnapshot to Postgres]
    SaveSnapshot --> ReturnFresh[Return Fresh Response]
```

## UI States Matrix
| State | Visual & Interactive Behavior |
|-------|-------------------------------|
| **Loading (Search / Trending)** | Skeleton cards rendered via `SearchSkeleton` pulsing subtle opacity. |
| **Empty (Search)** | Helpful query suggestions and recent topics. |
| **Empty (Reading List)** | Guidance banner encouraging user to bookmark articles from Search or Trending. |
| **Error (Search / Entrez Timeout)** | Non-blocking inline banner with retry action; prior results retained if available. |
| **Error (Trending Fetch)** | Gracefully serves latest cached snapshot with clear "Updated X ago" freshness indicator. |
| **Optimistic Action (Save Article)** | Toggle changes bookmark icon state instantly; displays confirmation toast; rolls back on API failure. |

## Scope Boundaries

### In Scope
- **Rust Backend**: Modern Axum web server with Tokio async runtime, Tower middleware (tracing, compression, static serving).
- **Direct Frontend Integration**: Reusing `researchpulse/frontend` build output (`dist/`) embedded into or served directly by the Axum binary.
- **Database Layer**: Serverless Postgres (Neon / Supabase free tier) using SQLx with compile-time query verification and automatic migrations on startup.
- **Core Endpoints Parity**:
  - `GET /api/search/` (NCBI Entrez esearch + efetch with XML parsing, pagination, and journal/date filters).
  - `GET /api/trending/` (Specialty + mode filtering, 60/180/365/730 day windows, velocity scoring, notability tiering, rank movement diffing).
  - `GET /api/trending/availability` (Cache lookup for pre-computed snapshots).
  - `GET /api/reading-list/` & `POST /api/reading-list/` & `DELETE /api/reading-list/{pmid}` (Saved articles CRUD with 409 conflict handling).
  - `GET /api/reading-list/citations` (Batch citation lookup for saved articles).
  - `POST /api/analytics/pageview` & `GET /api/analytics/summary` (Lightweight event logging and time-bucket aggregations).
  - `GET /api/health` (Readiness and liveness probe).
- **GCP Cloud Run Deployment**: Single container Dockerfile, minimal distroless/slim runner, zero min instances for 100% free-tier compliance.
- **GitLab CI/CD**: Keyless authentication via GCP Workload Identity Federation (WIF).
- **Production Migration**: Cutover from Netlify + Railway to GCP Cloud Run.

### Out of Scope (Phase 2 & Future)
- AI Summarization (Gemini API integration) - cleanly abstracted into a mockable trait/service interface for Phase 2 implementation.
- Multi-user authentication / OAuth login (retaining the current single-user / client-side reading list scope).
- Live WebSocket push updates (HTTP polling and stale-while-revalidate caching remain sufficient).
- Paid Cloud SQL instances or dedicated Redis clusters.

## Data Contracts

### 1. Search Contract (`GET /api/search/`)
- **Query Params**: `q` (string, required), `max_results` (int, default 20), `offset` (int, default 0), `journal` (optional string), `date_from` (optional string `YYYY/MM/DD`), `date_to` (optional string `YYYY/MM/DD`).
- **Response**:
  ```json
  {
    "total": 1420,
    "query": "immunotherapy",
    "results": [
      {
        "pmid": "38491029",
        "title": "Advances in CAR-T Cell Therapy",
        "abstract": "Text of the abstract...",
        "authors": ["Smith, John", "Doe, Jane"],
        "journal": "Nature Medicine",
        "pub_date": "2024/03",
        "doi": "10.1038/s41591-024-001",
        "publication_types": ["Journal Article", "Review"]
      }
    ]
  }
  ```

### 2. Reading List Contract
- **`POST /api/reading-list/`**:
  - Request: `{ "pmid": "38491029", "title": "...", "authors": ["..."], "journal": "...", "pub_date": "...", "doi": "..." }`
  - Response (201 Created): `{ "id": 1, "pmid": "38491029", "title": "...", "authors": "Smith, John, Doe, Jane", "journal": "...", "pub_date": "...", "doi": "...", "saved_at": "2026-10-09T16:00:00Z" }`
  - Response (409 Conflict): Treated as success by frontend.
- **`GET /api/reading-list/`**: Returns array of `SavedArticle`.
- **`DELETE /api/reading-list/{pmid}`**: Returns 204 No Content (or 404 handled gracefully).
- **`GET /api/reading-list/citations`**: Returns `{ "citations": { "38491029": 42 } }`.

### 3. Trending Contract (`GET /api/trending/`)
- **Query Params**: `specialty` (string, e.g. `cardiology`), `mode` (`trending` | `most_cited` | `new_notable`), `window_days` (`60` | `180` | `365` | `730`).
- **Response**:
  ```json
  {
    "specialty": "cardiology",
    "mode": "trending",
    "window_days": 365,
    "computed_at": "2026-10-09T14:30:00Z",
    "has_rank_history": true,
    "results": [
      {
        "pmid": "38491029",
        "title": "Cardiac Remodeling Post-Infarction",
        "abstract": "...",
        "authors": ["..."],
        "journal": "Circulation",
        "pub_date": "2024/01",
        "doi": "...",
        "publication_types": ["Clinical Trial", "Randomized Controlled Trial"],
        "citation_count": 87,
        "velocity": 0.412,
        "notable_type": "Randomized Controlled Trial",
        "rank_delta": 2,
        "is_new": false,
        "age_days": 190
      }
    ]
  }
  ```

### 4. Analytics Contract
- **`POST /api/analytics/pageview`**: `{ "path": "/trending", "referrer": "https://google.com" }` -> 200 OK.
- **`GET /api/analytics/summary?key={secret_key}`**: Returns 5-bucket summary (`today`, `this_week`, `this_month`, `this_year`, `all_time`).

### 5. Health Check Contract
- **`GET /api/health`**: Returns `{ "status": "ok", "version": "1.0.0", "database": "connected" }`.

## Edge Cases & Defensive Handling
1. **NCBI Entrez Rate Throttling**: Entrez enforces 3 req/sec without an API key. Token bucket rate limiter strictly bounds outgoing requests; on HTTP 429, exponential backoff (0.5s, 1s, 2s) retries up to 4 times before failing gracefully.
2. **Semantic Scholar Missing Paper 400**: When batching PMIDs to Semantic Scholar, if none exist in its citation graph, it responds with `400 "No valid paper ids given"`. The client explicitly catches 400 and returns empty citation map rather than failing.
3. **Database Cold Reconnects**: Serverless Postgres (Neon) suspends compute after idle timeout. Connection pool must set `idle_timeout` and perform auto-reconnect on initial query without terminating the client request.
4. **Duplicate Bookmark Insertion**: Concurrent save clicks produce duplicate inserts; handled via `ON CONFLICT (pmid) DO NOTHING` returning 409 status code.
5. **Zero-Citation Articles in Trending**: Filtered out in `trending` and `most_cited` modes; retained in `new_notable` mode to ensure fresh breakthroughs are surfaced immediately upon indexing.

## Open Questions
- None. All requirements and architectural invariants are locked from `/1-grill-me`.
