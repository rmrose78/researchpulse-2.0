# Workspace Rules for Antigravity (AGY) — ResearchPulse

Primary project rules and agent guidelines for this workspace. See [`AGY.md`](file:///Users/ryan/Desktop/Development/researchpulse/AGY.md) for full context.

## Stack Declaration
- **Full-stack**: FastAPI + SQLAlchemy + PostgreSQL (Railway) backend, React + TypeScript + SCSS Modules (Netlify) frontend.

## Pipeline & Workflows
- `/1-grill-me` → `/2-to-prd` → `/3-to-issues` → `/4-tdd`
- **Git PR Protocol**:
  - Always work on dedicated branch (`<issue-number>-<slug>`). Never on `main`.
  - Always run full test suite + pre-commit checklist before requesting commit.
  - Open Pull Request (`gh pr create`) with summary of changes after developer authorizes commit.
  - Never auto-merge — merge is always manual.
  - Respect explicit developer restraints when instructed not to commit or push.

## Agent Guidelines & Subagent Isolation
- Run heavy visual checks and accessibility sweeps via isolated subagents (`invoke_subagent` with `Model: "flash"`).
- Render multi-section documentation, PRDs, issue specs, and walkthroughs as structured user-facing Artifacts.
- Maintain AAA test structure (`# Arrange`, `# Act`, `# Assert`) on backend and component-first testing on frontend.
- No em dashes in prose, copy, or commit messages.
