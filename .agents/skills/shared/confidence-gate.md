# Confidence Gate

Shared by all AGY pipeline skills (grill-me, to-prd, to-issues, tdd). Run this immediately before concluding a pipeline phase.

## Process

1. State a confidence percentage (0–100%) that there's enough information to proceed without the developer needing to correct this later. Target: **95%+ confidence**.
2. If 95% or higher — proceed to the completion banner.
3. If under 95% — ask ONE targeted question narrowing the single biggest remaining gap. (Use `ask_question` tool if multiple-choice choices are helpful). Never stack questions. Re-assess confidence after the answer and repeat from step 1.

## Carve-out — don't ask what you can look up

Skip asking if the gap is already answered by an existing artifact or document:
`AGY.md`, `.agents/rules.md`, a completed PRD or issue file, or an established repo convention. Cite the source instead of asking.

Don't manufacture questions to hit a quota — if the task is already fully specified, there is no gap to close. The gate exists to catch real ambiguity.

## Cap — 5 extra rounds

If still under 95% after 5 rounds of extra questions, stop looping:
- State the remaining assumptions explicitly, tagged `ASSUMED`.
- Log them into the PRD/issue's "Open Questions" section (or the tdd completion report).
- Proceed rather than blocking indefinitely — the developer can correct an assumption faster at review than by being stuck in an endless interview.
