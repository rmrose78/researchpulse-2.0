# Issue 2: Graceful degradation when Gemini quota is exhausted

## What
When Gemini rejects a call for quota reasons, the backend flips an
app-wide "unavailable" state, automatically retries after a cooldown,
and self-heals once a real request succeeds again — with no required
developer intervention. The frontend reflects this by disabling the
toggle with a short explanation, without affecting anything else in
the app.

## Why
This is the core safety requirement for the whole feature: since there
are no user accounts in this app, Gemini quota is one shared, app-wide
budget. Exhausting it must degrade this one feature, never the rest of
the site, and must not require the developer to notice and manually
flip something back on.

## Acceptance Criteria
- [ ] Backend detects a Gemini quota-rejection response and records an
      app-wide "unavailable since `<timestamp>`" state
- [ ] While unavailable, the summary endpoint returns a response the
      frontend can distinguish from a per-card transient failure
      (Issue 0's retry-eligible error)
- [ ] A new availability signal exists (mirroring the existing
      `GET /api/trending/availability` pattern) that the frontend
      polls/checks to decide whether to render the toggle as enabled
- [ ] After a defined cooldown window, the backend automatically
      attempts a real request again; on success, the unavailable state
      clears with no manual action
- [ ] While unavailable, the frontend shows the nav toggle visibly
      disabled/greyed with short explanatory text (e.g. "AI summaries
      are temporarily unavailable")
- [ ] `AI_ENABLED=false` produces the same frontend "unavailable"
      treatment as quota exhaustion (the two states look identical to
      the user; only the backend cause differs)
- [ ] Confirmed manually or via test: search, trending, and reading
      list all continue to work normally while the AI feature reports
      itself unavailable

## Layers Touched
- [ ] Database — none, or a small in-memory/DB-backed flag for the
      unavailable-since timestamp (implementation choice at build time)
- [ ] Backend — circuit-breaker logic wrapping the Gemini call in
      `gemini_service`; new availability endpoint/field
- [ ] Frontend — toggle component reads the availability signal and
      renders its disabled state; explanatory copy

## Edge Cases
- Quota resets mid-cooldown (e.g. daily reset happens before the
  cooldown window elapses) → next scheduled retry still succeeds
  normally, no special-casing needed
- A request comes in for an article whose summary is already cached
  while the feature is marked "unavailable" → cached result is still
  served (unavailability only blocks new Gemini calls, not reads of
  already-cached summaries)

## Blocked By
Issue 0 (wraps the endpoint/service that issue creates)

## Definition of Done
- [ ] Tests written and passing, red-green verified, including a
      simulated quota-rejection response and a simulated recovery
- [ ] Manually tested: force the circuit breaker open, confirm the
      toggle disables and the rest of the site is unaffected, confirm
      it re-enables after the cooldown
