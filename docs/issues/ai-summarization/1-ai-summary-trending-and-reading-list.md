# Issue 1: AI summaries on Trending and Reading List

## What
Extend the AI summary toggle from Issue 0 to the Trending and Reading
List pages, which both reuse `ArticleCard` but feed it different data
shapes than Search does.

## Why
The toggle is a global, app-wide preference — a user shouldn't get
plain-English summaries on Search but not on the other two pages where
they read the exact same articles.

## Acceptance Criteria
- [ ] With the toggle on, expanding a card on the Trending page shows
      the same summary/loading/error states as Search (Issue 0),
      including reusing an already-cached summary for an article also
      seen on Search
- [ ] With the toggle on, expanding a card on the Reading List page
      shows the same summary/loading/error states, using only the
      article's `pmid` — the summary fetch does not depend on the
      frontend already holding abstract text
- [ ] Reading List's `ArticleCard` now shows an expand affordance when
      the toggle is on, even though its `SavedArticle` →
      `ArticleSearchResult` conversion (`reading-list-page.tsx`)
      hardcodes `abstract: null` — the expand condition is decoupled
      from local `article.abstract` truthiness
- [ ] With the toggle off, Reading List's behavior is unchanged from
      today (no expand affordance, since there's still no abstract to
      show)

## Layers Touched
- [ ] Database — none (reuses Issue 0's `article_summaries` table)
- [ ] Backend — none (reuses Issue 0's endpoint)
- [ ] Frontend — `ArticleCard`'s expand-condition logic; `TrendingPage`
      and `ReadingListPage` wiring to pass through whatever `ArticleCard`
      needs to trigger a summary fetch by `pmid`

## Edge Cases
- Reading List article whose real PubMed record has no abstract at all
  → still no summary possible (this is a genuine "nothing to
  summarize" case, distinct from the `abstract: null` conversion
  artifact this issue fixes)
- Same article appears on both Search and Trending in the same
  session → second page's expand hits the server cache, no duplicate
  Gemini call

## Blocked By
Issue 0 (needs the endpoint, toggle, and `ArticleCard` states to exist)

## Definition of Done
- [ ] Tests written and passing, red-green verified, for both pages
- [ ] `npm run test:a11y` passes for Trending and Reading List
- [ ] Manually tested in browser on both pages, including the
      Reading List abstract-less case
