# Design Direction

Tone: Clinical credibility meets modern clarity.
Not playful. Not corporate. Precise and trustworthy.

Primary palette:
- Deep navy #0A1628 — primary background, conveys authority
- Clean white #F8FAFC — content background, breathing room
- Electric blue #276DB7 — primary accent, links, CTAs (darkened from
  #2973C1 — that value was 4.19-4.39:1 as text on the `.chip` badge tint,
  short of WCAG's 4.5:1 minimum; caught by the real-browser a11y sweep,
  issue #49)
- Electric blue (on dark) #3583D4 — accent on navy/dark backgrounds only
  (e.g. the nav logo's "Pulse" text/mark on the header); the primary
  Electric blue is too dark to clear 4.5:1 against navy, so dark
  backgrounds use this lighter variant instead
- Slate gray #64748B — secondary text, metadata
- Success green #059669 — positive states
- Error red #DC2626 — error states

Typography:
- Heading: Inter, weight 600-700
- Body: Inter, weight 400
- Mono: JetBrains Mono for PMIDs and DOIs

Spacing: 4px base unit (4, 8, 12, 16, 24, 32, 48, 64)

Component feel:
- Subtle shadows — not flat, not heavy
- 6-8px border radius on cards
- Generous whitespace — content is the hero
- Hover states on all interactive elements
- Smooth transitions 150-200ms ease
