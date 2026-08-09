---
name: 1-grill-me
description: Pre-code feature discovery and UI/UX interview using Antigravity ask_question and discovery tools. Discovers project state first, then conducts structured interviews.
---

# Skill: 1-grill-me

Before writing any code, discover what exists then interview the developer. Think like a UI/UX designer and product engineer.

## Flow

```
1. Run discovery — inspect project state (AGY.md, src/, docs/)
2. If frontend missing or incomplete — run foundation check via ask_question
3. Run UI/UX interview — visual and interaction requirements
4. Run feature interview — functional requirements
5. Run confidence gate — .agents/skills/shared/confidence-gate.md
6. Output GRILL COMPLETE summary
```

## Step 1 — Discovery
Inspect project files and handoff documentation to ascertain current progress.

## Step 2 — Foundation Check
If discovery reveals core infrastructure or design direction is missing, use the `ask_question` tool to clarify:
- Scaffolding status (from scratch vs template)
- Design direction selection (e.g. read AGY.md / mockdrafts)
- Primary target devices (desktop, mobile, or both)
- Brand identity assets (logos, emblems, color system)

## Step 3 — UI/UX Interview
Ask targeted questions regarding visual layout, typography, contrast, animations, and micro-interactions.

## Step 4 — Feature Interview
Ask ONE question at a time. Wait for answer before asking the next.

## Step 5 — Confidence Gate
Before producing the GRILL COMPLETE summary, run `.agents/skills/shared/confidence-gate.md`. Target: 95%+ confidence.

### Question Categories:
- **What**: Exact feature scope, success criteria, explicit out-of-scope items.
- **Who**: Target audience and primary use cases.
- **Data**: Inputs, outputs, persistence (localStorage, third-party services, static files).
- **Edge Cases**: Empty states, error states, long content, narrow viewports.
- **Integration**: Routing, new dependencies, component layout.

## Rules
- ONE question at a time — never stack questions in plain text.
- Use `ask_question` when providing multi-choice options.
- Never suggest or write implementation code during this phase.
- Check `AGY.md` stack declaration (frontend-only vs full-stack) before asking data questions.

## When Done

Output the summary:

```
GRILL COMPLETE

Project state:
- Scaffold: <exists / needs scaffolding>
- Stack: <frontend-only / full-stack, per AGY.md>
- Foundation needed: <yes / no>
- Design direction: <from AGY.md or approved design document>

Feature summary:
- Feature: <one sentence summary>
- User: <target persona>
- Inputs: <form fields, props, data>
- Outputs: <rendered components, state updates>
- States: <loading / empty / error / success behaviors>
- Edge cases: <boundary conditions>
- Out of scope: <explicit exclusions>

Ready to run /2-to-prd
```
