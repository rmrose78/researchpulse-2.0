# PRD: AI Summarization (Phase 3)

## Problem
Clinicians, health IT analysts, and policy professionals scanning
trending research need a fast, critically-honest read on what a study
actually claims and how much weight that claim can bear — not just a
plain-English restatement of a PubMed abstract they could already read.

## Success Criteria
- [ ] A global "Show AI summaries" toggle in the nav (desktop + mobile)
      changes what ArticleCard's expand reveals, on Search, Trending,
      and Reading List alike
- [ ] Expanding a card with the toggle on shows a 3-4 sentence summary:
      what the study found (plain English) + a study-design caveat
      grounded in the article's actual `publication_types` metadata
      (not freely inferred by the model)
- [ ] Summaries are cached per PMID server-side — the same article is
      never re-billed to Gemini for a second viewer
- [ ] Gemini quota exhaustion degrades the feature only — the toggle
      visibly disables with an explanation, the rest of the app is
      completely unaffected
- [ ] The feature recovers on its own after a cooldown once quota
      allows real requests again — no required developer intervention
- [ ] Every AI-generated summary is visibly labeled as such on the card
      itself, not only documented on a separate page

## User Stories
- As a clinician skimming trending research, I want a fast plain-English
  read on a study that also tells me how much confidence the design
  supports, so I don't have to parse the full abstract to gauge rigor.
- As the developer, I want the feature to fail toward "just show the
  abstract" under any AI-provider failure, so a Gemini outage never
  takes down search, trending, or the reading list.
- As the developer, I want a global preference that doesn't itself spend
  money, so flipping one switch can't burst-generate 20 paid calls.

## Design Direction
Color palette: existing clinical palette (`docs/reference/design-direction.md`)
— navy #0A1628, white #F8FAFC, electric blue #276DB7 (#3583D4 on dark),
slate #64748B for metadata/secondary text.
Typography: existing Inter/JetBrains Mono scale, no new fonts.
Visual tone: clinical, precise — the AI-generated label should read as
matter-of-fact provenance, not a flashy "AI!" callout; styled like the
existing muted `notableType`/metadata badges already on ArticleCard, not
a bright accent color.
Key interactions: toggle lives in top nav, persists to `localStorage`
(same mechanism as the existing sticky specialty/mode selection);
flipping it does not fetch anything by itself — only expanding a given
card, with the toggle on, triggers that card's fetch. Skeleton/shimmer
loading reuses `SearchSkeleton`'s visual language. 150-200ms transitions
per existing convention.
Mobile behavior: toggle appears in the mobile hamburger nav alongside
existing nav links; card behavior (expand reveals summary vs. abstract)
is identical to desktop, no mobile-specific layout change beyond what
ArticleCard already does responsively.

## UI States
| State | What the user sees |
|-------|--------------------|
| Toggle off | Unchanged today's behavior — abstract shown on expand |
| Toggle on, card expanded, cache miss | Skeleton/shimmer lines in place of the abstract (first-time generation, ~1-3s) |
| Toggle on, card expanded, cache hit | Summary appears instantly (server-cached, no visible loading) |
| Success | 3-4 sentence claim + evidence-tier-grounded caveat, with a small "AI-generated" label on the summary block |
| Per-card error (transient) | Inline "Couldn't generate a summary — [Try again]", independent of the global toggle; retry re-attempts just that card |
| Feature unavailable (quota exhausted or `AI_ENABLED=false`) | Nav toggle shown visibly disabled/greyed, with short explanatory text (e.g. "AI summaries are temporarily unavailable") |
| No abstract in PubMed | No expand affordance for that card at all — same as today's behavior, nothing to summarize |

## Scope

### In Scope
- New backend endpoint `GET /api/search/{pmid}/summary`
- Backend availability signal (mirrors `GET /api/trending/availability`)
  so the frontend can proactively show "unavailable" rather than
  inferring it from failed requests
- Server-side cache keyed by PMID, no expiry (abstracts don't change),
  with a `prompt_version` column from day one — cheap now, expensive to
  retrofit if the prompt is revised later and old/new cached summaries
  need to be told apart
- Gemini call grounded in title + abstract + `publication_types` (already
  present in `ArticleSearchResult`/PubMed data) — the model restates the
  claim in plain English and weaves in the caveat from the known
  evidence tier/study-design tags; instructed not to state a limitation
  the structured data and abstract don't actually support. If
  `publication_types` is empty (some older/poorly-tagged PubMed records),
  the caveat is omitted rather than invented
- Automatic circuit breaker: backend detects Gemini quota-rejection,
  flips an app-wide unavailable flag, auto-retries after a cooldown
  window, self-heals on the next successful call
- Static `AI_ENABLED` env flag as a manual override on top of the
  automatic circuit breaker
- Global nav toggle (desktop + mobile), persisted to `localStorage`
- `ArticleCard` changes: expand-affordance decoupled from local
  `article.abstract` truthiness (currently blocks Reading List, whose
  `SavedArticle`→`ArticleSearchResult` conversion hardcodes
  `abstract: null` — summary fetch only needs the `pmid`, which Reading
  List already has), new loading/error/success/unavailable states, an
  inline "AI-generated" label on the summary block
- "How It Works" page gets a short explainer, matching the existing
  `velocity-explainer`/`notability-explainer` pattern

### Out of Scope
- Pulling full article text (most PubMed articles are paywalled — would
  need a second integration like PMC/Unpaywall)
- Pulling external discussion/altmetric data (separate third-party
  integration, its own cost/rate-limit surface)
- Per-user personalization or rate limiting (no auth system exists in
  this app — there is no per-user quota to enforce, only one shared
  app-wide Gemini quota)
- Multi-language output, text-to-speech
- A user-facing "report inaccurate summary" feedback mechanism — flagged
  during critical review as worth real consideration for a health-
  adjacent AI output, but it's new scope (storage, moderation) not
  covered in the original interview; captured as an Open Question below
  rather than silently added

## Data
### Inputs
- `pmid` (already available everywhere ArticleCard renders)
- Backend-side lookup: title, abstract, `publication_types` via the
  existing PubMed service — the frontend never needs to already hold
  this data

### Outputs
- Cached summary text (3-4 sentences: claim + grounded caveat)
- Availability status (`ai_available: bool` or equivalent) for the
  circuit-breaker/kill-switch state
- Per-request success/error signal for the per-card state

### Stored
- New table, e.g. `article_summaries(pmid, summary, prompt_version,
  generated_at)` — indefinite retention, no TTL

## Edge Cases
- Article has no abstract in PubMed → no expand affordance, nothing to
  summarize (same as today)
- Article has no `publication_types` tags → caveat is omitted rather
  than invented; summary is claim-only in that case
- Reading List's abstract-less `SavedArticle` conversion → resolved by
  decoupling the expand affordance from local abstract presence (see
  Scope); the summary fetch only needs `pmid`
- Gemini quota exhausted → app-wide circuit breaker, auto-retry after
  cooldown, toggle shows disabled + explanation in the meantime
- Single request fails for a non-quota reason → inline per-card retry,
  does not affect the global toggle or other cards
- `AI_ENABLED=false` → same "unavailable" treatment as quota exhaustion,
  manual override takes precedence

## Open Questions
- Should there be a lightweight "report inaccurate summary" affordance,
  given the audience may include clinicians acting on this content?
  Raised during critical review; not in original interview scope, needs
  its own discussion before committing (storage shape, moderation,
  whether it's even worth the surface area for a v1).
- Exact cooldown duration for the circuit breaker's auto-retry (e.g. 1
  hour vs. next daily quota reset) — an implementation detail for
  `/4-tdd`, not a product decision, but worth picking deliberately
  against whatever Gemini's actual free-tier reset window turns out to
  be at build time.
