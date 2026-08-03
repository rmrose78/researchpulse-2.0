# Backend Standards — ResearchPulse

Read this before writing any backend code.

## Stack
- FastAPI + SQLAlchemy + PostgreSQL (Railway)
- Pydantic for request/response schemas and settings

## Conventions
- Routers stay thin — all logic goes in services
- Never write raw SQL — SQLAlchemy only
- All route handlers and service methods must be async
- Pydantic schemas define all request/response shapes
- External API calls go through services — never call them from routers
- Environment variables loaded via pydantic-settings, never hardcoded

## Testability Is a Design Constraint

Keep decision/business logic in services as pure functions of their
inputs, separate from the DB session and external HTTP calls that feed
them. A service method that interleaves "decide what to do" with
"fetch from the DB" and "call PubMed" in one block can usually only be
tested by mocking SQLAlchemy or a live external call — slow, brittle,
and easy to get wrong. Prefer: pull the data first (or accept it as an
argument), then run the actual decision logic as something callable and
assertable on its own, with the DB/HTTP calls as thin wrappers around
it. This isn't a hard rule for every function — but if you're about to
write a test that only works by mocking three layers deep, that's a
signal the logic and the I/O should have been split before the test was
needed. Flag it to the developer rather than writing a brittle mock to
work around it.
