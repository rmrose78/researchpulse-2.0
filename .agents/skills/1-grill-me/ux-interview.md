# UX Interview — Visual and Interaction Requirements

Ask these for every feature with a visual component.
Use `ask_question` tool for interactive user feedback.

## Layout and Structure
- What does the user see when they first land on this screen?
- What is the primary action — what should draw the eye first?
- What is secondary — supporting information or actions?
- How does this fit into the existing layout — new page, panel, modal?

## States
- What does the loading state look like — skeleton, spinner, or nothing?
- What does the empty state look like — message, illustration, CTA?
- What does an error look like — inline, toast, full page?
- Is there a success confirmation or does the UI just update?

## Interactions
- Beyond clicking — are there hover states, animations, transitions?
- Should this feel instant or is a brief loading indicator appropriate?
- Any keyboard shortcuts or power-user interactions?
- Does anything animate in or out?

## Mobile
- Does the layout change significantly on small screens?
- Are there touch-specific interactions to consider?
- Any content that should be hidden or collapsed on mobile?

## Content Priority
- What information is most important — what must be visible immediately?
- What can be secondary — shown on hover, expand, or detail view?
- Is there any content that should be truncated with a read more?

## Design References
- Read `docs/reference/design-direction.md` before proposing anything
- If design direction is not defined there — ask developer before proposing
- Never invent a visual direction without checking that file first
