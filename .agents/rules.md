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
- **Visual Contrast & Parent Context**: Always inspect the parent container's computed background color before styling text/badges. Never assign light text tokens (`$white`, `$gray-300`) to light-background sections (`$bg`: `#f8fafc`, `$surface`: `#ffffff`).
- **Strict Hover Semantics**: Never add hover lift physics (`transform: translateY(...)`) or highlight borders to static non-clickable display cards (`.featureCard`, `.card`, `.bucket`). Hover states are strictly reserved for clickable buttons, links, and chips.
- **Real-Browser Accessibility & Contrast Sweeps**: `jsdom` (Jest) cannot measure composited CSS module contrast against parent backgrounds. Always verify visual contrast using real headless browser tools (`npm run test:a11y` with Playwright, `npm run lighthouse:a11y`, or native AGY Chrome CDP visual sweeps).
- **Human Creative Touch (No Emoji Gimmicks)**: Avoid using random emoji characters (e.g. 🧬, 💊, 🧠, 🚀, 💡) in UI labels, buttons, or subheadings. Use clean Lucide SVG icons or refined typography to maintain an executive, handcrafted biomedical design.
- Render multi-section documentation, PRDs, issue specs, and walkthroughs as structured user-facing Artifacts.
- Maintain AAA test structure (`# Arrange`, `# Act`, `# Assert`) on backend and component-first testing on frontend.
- No em dashes in prose, copy, or commit messages.


