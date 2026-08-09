# Issue 3: "How It Works" explainer for AI summaries

## What
A short explainer on the How It Works page describing the AI summary
feature — what it does, what it's built from, and its limitations —
matching the existing `velocity-explainer`/`notability-explainer`
pattern already used for other features.

## Why
Every other major feature (citation velocity, evidence-tier badges) has
a plain explanation of how it works on this page. An AI-generated
feature needs this even more, since users should understand what
they're reading is model-generated and grounded in structured metadata,
not sourced from full-text analysis.

## Acceptance Criteria
- [ ] A new explainer component exists on the How It Works page,
      styled consistently with `velocity-explainer` and
      `notability-explainer`
- [ ] Copy explains: the summary is AI-generated (Gemini), built from
      the article's title/abstract/evidence-tier metadata only (not
      full text), cached once per article, and may occasionally be
      unavailable if usage limits are reached
- [ ] Linked or referenced from wherever the AI-generated label appears
      on a card (optional nice-to-have if trivial; not required if it
      adds meaningful scope)

## Layers Touched
- [ ] Database — none
- [ ] Backend — none
- [ ] Frontend — new explainer component + SCSS module in
      `src/components/sections/`; addition to `how-it-works-page.tsx`

## Edge Cases
None — this is static, content-only UI.

## Blocked By
Issue 0 (the feature needs to exist to describe accurately)

## Definition of Done
- [ ] jest-axe test for the new component (loading/empty/error states
      don't apply here — it's static content, one axe assertion is
      sufficient)
- [ ] Manually verified in browser alongside the existing explainers
