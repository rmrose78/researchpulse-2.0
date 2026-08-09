# Phases

### Phase 1 — Core (complete)
Search PubMed, view article details, save to reading list.
Not the differentiator — required foundation.

### Phase 2 — Trending (the differentiator, complete)
Citation velocity algorithm: `velocity = total_citations / (article_age_in_days + 21)`
Three modes: Trending, Most Cited, New & Notable — all three built.
Semantic Scholar for citation data. Results cached per specialty/mode/window
in `trending_snapshots`, with a slice-sampling pool architecture to keep
results deep across wide time ranges.

Done:
- Routing foundation, reading list save/remove/view
- Trending mode by specialty, with citation-velocity ranking
- Most Cited and New & Notable modes
- PubMed-style left filter rail (Mode / Specialty / Time Range)
- Mobile hamburger nav
- New & Notable evidence-tier badge
- Rank-movement badges
- "Why it's trending" line + reading list crossover (citation-stat detail
  qualifier for Trending/Most Cited, standalone sentence for New & Notable;
  live re-fetched citation counts on the Reading List page)
- Sticky specialty/mode selection across visits (localStorage, URL params
  take precedence for shareable/bookmarked links)

### Phase 3 — AI Summarization (accessibility layer)
Plain-English summaries via Gemini API (Gemini 2.5 Flash).
Feature flagged: `ai_enabled: bool` in config.
Endpoint: `GET /api/search/{pmid}/summary`

### Phase 4 — Citation Network
Interactive citation graph via react-force-graph or D3.js.
