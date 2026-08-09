# Issue 0: AI plain-English summaries on Search results

## What
A global "Show AI summaries" toggle in the nav lets a user replace an
article's raw PubMed abstract with a 3-4 sentence AI-generated summary
(claim + a study-design caveat grounded in the article's evidence tier),
generated via Gemini and cached server-side per PMID. Ships on the
Search page first.

## Why
Clinicians, health IT analysts, and policy professionals scanning
results need a fast, critically-honest read on what a study actually
claims and how much weight its design can bear — without parsing the
full abstract themselves, and without an AI feature that can silently
overstate rigor it can't verify.

## Acceptance Criteria
- [ ] A "Show AI summaries" toggle exists in the desktop nav and the
      mobile hamburger nav, persisted to `localStorage` (same mechanism
      as the existing sticky specialty/mode selection)
- [ ] Flipping the toggle on does **not** itself trigger any Gemini call
      — it only changes what happens the next time a card is expanded
- [ ] On the Search page, expanding an `ArticleCard` with the toggle on
      and no cached summary shows a skeleton/shimmer loading state
      (matching `SearchSkeleton`'s visual language), then the generated
      summary in place of the abstract
- [ ] The summary is 3-4 sentences: what the study found in plain
      English, plus a study-design caveat derived from the article's
      `publication_types` (e.g. "this is a case report, not a
      controlled trial") — not left to the model's free inference of
      the abstract prose
- [ ] If `publication_types` is empty for an article, the caveat is
      omitted rather than invented — summary is claim-only in that case
- [ ] The summary carries a small, visible "AI-generated" label,
      styled like the existing muted `notableType` badge (not a bright
      accent color)
- [ ] A second expand of the same article (by anyone) reuses the cached
      summary — confirmed via a repeat request not re-calling Gemini
- [ ] A single failed generation shows an inline "Couldn't generate a
      summary — Try again" message on that card only, with a working
      retry action; it does not disable the toggle or affect other cards
- [ ] `AI_ENABLED=false` in backend config fully suppresses the feature
      (toggle does not appear, or appears disabled) regardless of
      Gemini's actual availability

## Layers Touched
- [ ] Database — new `article_summaries` table: `pmid`, `summary`,
      `prompt_version`, `generated_at`; no TTL/expiry
- [ ] Backend — new `GET /api/search/{pmid}/summary` endpoint; new
      `gemini_service` (external API call lives in a service, not the
      router, per `be-standards.md`); new `ai_enabled` + Gemini settings
      in `config.py`; prompt built from title + abstract +
      `publication_types` looked up via the existing PubMed service
- [ ] Frontend — nav toggle component (`src/components/layout/`)
      persisted to `localStorage`; new `ArticleSummary` type
      (`src/types/index.ts`); `getArticleSummary` in `src/utils/api.ts`;
      `ArticleCard` (`frontend/src/components/sections/article-card/`)
      gets loading/success/per-card-error states and the AI-generated
      label

## Edge Cases
- Article has no abstract in PubMed → no expand affordance at all,
  same as today's behavior — nothing to summarize
- Article has `publication_types: []` → caveat omitted, claim-only
  summary
- Toggle flipped on with several cards already expanded on screen →
  no summaries fetch retroactively; only expanding (or re-expanding)
  a card after the toggle is on triggers that card's fetch
- Gemini returns a malformed/empty response → treated as a per-card
  error (retry path), not a crash

## Blocked By
None — this is the foundational slice.

## Definition of Done
- [ ] Tests written and passing (backend: AAA structure, red-green
      verified; frontend: jest + jest-axe, red-green verified)
- [ ] `npm run test:a11y` passes for the modified Search page/ArticleCard
- [ ] Manually tested in browser: toggle on/off, expand with cache miss
      and cache hit, forced per-card failure and retry
