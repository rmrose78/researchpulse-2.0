# Discovery — Read Before Asking Any Questions

Before interviewing the developer, read the codebase and report what exists. This prevents asking questions that the codebase already answers.

## What to Read

### Project Context
- Read AGY.md — understand stack, conventions, design direction
- Read README.md — understand product pitch and current status
- Read docs/prd/ — what features have already been planned?
- Read docs/issues/ — what work is already broken down?

### Frontend State
- Does frontend/ directory exist?
- If yes — read frontend/package.json for installed dependencies
- Does src/styles/_variables.scss exist? Read it — design tokens defined?
- Does src/styles/_mixins.scss exist?
- Does src/components/layout/ exist? What's in it?
- Does src/utils/api.ts exist? Is API client configured?
- Does src/types/ exist? What interfaces are defined?

### Backend State
- Read backend/app/routers/ — what endpoints exist?
- Read backend/app/schemas/ — what data shapes are defined?
- Are there endpoints the new feature could consume as-is?

## Report Format

Output this before asking any questions:

```
DISCOVERY COMPLETE

Project: ResearchPulse
Design direction: <found in AGY.md / docs/reference/design-direction.md>

Frontend:
- Scaffold: exists / does not exist
- Design tokens: defined / not defined
- Layout shell: exists / does not exist
- API client: exists / does not exist
- Existing types: <list or none>

Backend endpoints available:
- <list endpoints that exist and could be consumed>

Existing PRDs: <list or none>
Existing issues: <list or none>

Foundation needed before feature work: yes / no
Reason: <why if yes>

Starting interview...
```
