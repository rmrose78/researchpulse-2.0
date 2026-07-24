# API Endpoints

GET    /health                      ✅ done
GET    /api/search/                 ✅ done
GET    /api/search/{pmid}           ✅ done
POST   /api/reading-list/           ✅ done
GET    /api/reading-list/           ✅ done
DELETE /api/reading-list/{pmid}     ✅ done
GET    /api/trending/               ✅ done — query params: specialty, mode
                                     (trending | most_cited | new_notable),
                                     window_days. Response includes
                                     `has_rank_history` (bool) — whether a
                                     prior snapshot existed to diff
                                     rank-movement badges against,
                                     independent of whether anything moved
GET    /api/trending/availability   ✅ done — same specialty/mode/window_days
                                     params, used to drive fallback messaging
GET    /api/reading-list/citations  ✅ done — best-effort live Semantic Scholar
                                     citation counts for all saved articles,
                                     decoupled from the primary reading-list
                                     fetch (mirrors /api/trending/availability)
GET    /api/search/{pmid}/summary   — Phase 3
POST   /api/analytics/pageview      ✅ done — anonymous page-view logging,
                                     fired by the frontend on every route
                                     change
GET    /api/analytics/summary       ✅ done — Day/Week/Month/Year/All-time
                                     view counts + top paths/referrers;
                                     requires a `key` query param matching
                                     `ANALYTICS_SECRET`, fails closed (404) if
                                     unset or mismatched
