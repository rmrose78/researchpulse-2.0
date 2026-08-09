---
name: a11y-sweep
description: Native AGY Chrome browser accessibility sweep executed via an isolated subagent.
---

# Skill: a11y-sweep

Invoke this skill when requested by the developer via `/a11y-sweep`.

## Core Upgrade: Native AGY Chrome Browser Tools
Accessibility scanning leverages **Antigravity's native Chrome browser tools** (`read_browser_page`, `execute_browser_script`, CDP Accessibility Tree inspection). To keep the main conversation thread clean and fast, delegate the sweep to an isolated subagent:

```json
{
  "Subagents": [
    {
      "TypeName": "research",
      "Role": "Accessibility Sweep Subagent",
      "Model": "flash",
      "Prompt": "Run native Chrome browser accessibility scan against http://localhost:5173 using AGY browser tools. Group DOM accessibility tree & WCAG violations by criterion and return a condensed summary report."
    }
  ]
}
```

## Steps
1. Subagent connects to Chrome using AGY native browser tools at mobile (375px) and desktop (1440px) viewports across interactive states (e.g. navigation menu open).
2. Subagent executes native DOM accessibility tree inspection and WCAG contrast/label validation.
3. Subagent returns condensed summary report grouped by WCAG impact (Critical, Serious, Moderate, Minor).

## Report Schema

```
A11Y SWEEP RESULTS

Automated Suite (AGY Native Chrome CDP Tools):
- [pass/fail] Homepage Mobile (375px)
- [pass/fail] Homepage Desktop (1440px)
- [pass/fail] Navigation Open State

Violations Summary:
- <rule-id> (<impact>) — <element selector> — WCAG <criterion> — <fix recommendation>

Manual Checklist Reminders:
- Full-page tab sequence
- Focus-visible rendering
- Screen reader audio clarity
```
