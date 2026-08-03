# Visual Verification

Run before the pre-commit checklist, in place of a plain eyeball check.

Precondition: dev server running — `cd frontend && npm run dev` (`http://localhost:5173`).

## If a target design screenshot was provided for this component/page

**Round 1 — baseline (real screenshots):**
1. View the target screenshot.
2. Use the Playwright MCP tools to navigate to the relevant route and capture
   screenshots at:
   - Mobile — 375px wide
   - Desktop — 1440px wide

   (mobile-first, matching this project's breakpoint convention)
3. Compare the rendered screenshots against both the target image and
   `docs/reference/design-direction.md` (palette, typography, spacing,
   radius, shadows, transitions). "Modern sleek" is graded against these
   concrete tokens, not vibes.
4. Score confidence 0–100%. If under 95%, list concrete gaps, e.g.:
   `spacing is 12px, should be 16px per the spacing scale`
   `accent color is #3B82F6, should be #2973C1 per design-direction.md`

**Rounds 2–4 — fix-verify iterations (cheap checks, no screenshots):**
5. Fix the code. Instead of re-screenshotting, use:
   - `browser_evaluate` to read the actual computed styles (padding, color,
     border-radius, font-weight) as plain values — diff those numbers/strings
     directly against `docs/reference/design-direction.md` tokens
   - `browser_snapshot` (accessibility tree) to check structure, contrast
     issues, and landmark/focus order

   This catches the same gaps as a visual re-inspection at a fraction of the
   token cost — image tokens only get spent when there's something to look
   at that text can't answer (actual layout/composition), not on re-checking
   values you can read directly.
6. Re-score confidence from the computed-style diff. Cap at 5 total
   iterations (including round 1). If still under 95% after 5 rounds, stop
   looping — report the remaining gaps to the developer instead of
   continuing indefinitely.

**Final round — confirmation (real screenshots again):**
7. Once the computed-style diff clears 95%, take one more real screenshot
   pair (mobile + desktop) — this is the image the developer actually
   reviews, so it must reflect the real render, not just computed values.
8. Capture console messages during each pass (feeds the pre-commit
   "no console errors or warnings" item — this is captured here, not
   re-captured in pre-commit.md).

## Efficiency note

This loop is tool-call-dense (screenshots, `browser_evaluate` reads,
accessibility-tree snapshots across up to 5 rounds). Delegate the whole
loop to a background Agent call rather than running it inline in the main
conversation — have the subagent execute rounds 1–7 above and return only
a condensed report (confidence score, remaining gaps if any, and the final
screenshot pair), keeping the raw intermediate tool output out of the main
thread's context.

## If no target screenshot was supplied

Fall back to the standard manual check — this loop only runs when there's
something concrete to compare against:

```
VISUAL VERIFICATION REQUIRED

URL: http://localhost:5173/<path>

Expected behavior:
- [ ] <what user sees>
- [ ] <what happens on interaction>
- [ ] <edge case behavior>

Keyboard test:
- Tab through page — all interactive elements reachable
- Enter/Space activates buttons

Waiting for your confirmation before committing.
```

## Always

Regardless of automated confidence score, end with the developer
confirmation gate before committing. Never auto-commit — the automated
loop assists iteration, it does not replace human sign-off.
