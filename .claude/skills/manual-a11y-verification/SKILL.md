---
name: manual-a11y-verification
description: Portable checklist of accessibility/UX issues that AI code review and automated tooling (ESLint, jest-axe, Playwright+axe-core, Lighthouse) structurally cannot verify. Walks the developer through confirming each one manually. Manual/opt-in only — never invoked automatically, always ask before running.
---

# Skill: manual-a11y-verification

Invoke this only when the developer explicitly runs
`/manual-a11y-verification`, or asks for a manual accessibility pass, a
"human check," or similar. Never run this automatically or silently —
same rule as `a11y-sweep` and `visual-check`.

This skill is portable: copy the whole `manual-a11y-verification/`
folder into another repo's `.claude/skills/` and it works as-is. The
checklist below is deliberately written without references to this
repo's specific components — if you want to add a "how to check this in
*our* app" note per item, do that in a local addendum, not by editing
the checklist items themselves.

## Why this exists

Every other tool in this project's a11y stack (`eslint-plugin-jsx-a11y`,
`jest-axe`, the Playwright+axe-core sweep, Lighthouse) checks *rules* —
things with a clear, syntactic pass/fail. A large class of real
accessibility and usability problems has no such rule, either because
WCAG's success criteria are satisfied by more than one design (a skip
link is *one* way to pass "bypass blocks," not the only way — proper
landmark structure alone also passes it, so a missing skip link on a
page with landmarks won't be flagged by any automated scanner) or
because the criterion is inherently about human judgment (does this
error message actually make sense read aloud?). No amount of AI code
review changes this — an LLM reading source code has the same blind
spot as the automated tools it's reasoning about, for the same
structural reason: there's no rule to check against, only a human
judgment to make.

Treat every item below as something that can currently be **passing all
automated checks and still be broken**. That's the point of this list.

## Checklist

For each item: why nothing automated catches it, and the concrete action
to take to verify it yourself.

1. **Skip link / bypass blocks actually present and working.**
   *Why nothing catches it*: axe-core's `bypass` rule (WCAG 2.4.1) is
   satisfied by landmark structure alone — a page with proper
   `<nav>`/`<main>` regions passes even with zero skip links.
   *Verify*: Load the page fresh, press Tab once. A skip link should be
   the first focusable element, visible when focused, and actually move
   focus/scroll to main content when activated.

2. **Full-page keyboard tab order.**
   *Why nothing catches it*: component-level tests (jest-axe) render one
   component in isolation and can't see the order across the whole
   composed page; the real-browser sweep only checks the specific states
   someone wrote a test for, not a full manual traversal.
   *Verify*: Tab through the entire page top to bottom. Order should
   match visual reading order — no jumps, no elements skipped, no
   elements you can see but never reach.

3. **Focus-visible indicator actually renders, not just declared in CSS.**
   *Why nothing catches it*: a `:focus-visible` rule can exist in the
   stylesheet and still be invisible in practice — clipped by
   `overflow: hidden` on a parent, covered by a sticky header, or too
   low-contrast to see.
   *Verify*: Tab through every interactive element and confirm you can
   actually *see* a focus indicator at each stop, not just that one is
   defined in code.

4. **Screen-reader announcement quality.**
   *Why nothing catches it*: `aria-live`, `role="alert"`, and similar
   attributes existing is a syntactic check; whether the announcement is
   timed correctly and sounds coherent read aloud is not.
   *Verify*: Turn on a screen reader (VoiceOver on macOS: Cmd+F5) and go
   through the page's key interactions. Confirm announcements happen at
   the right moment and make sense out of visual context.

5. **Zoom / text-resize to 200%.**
   *Why nothing catches it*: none of the automated tools simulate
   browser zoom; layout can break in ways no DOM-level rule detects.
   *Verify*: Zoom the browser to 200% (Cmd/Ctrl + repeatedly, or browser
   zoom setting). Confirm no clipped or overlapping content, no loss of
   functionality, no unintended horizontal scroll on body text.

6. **Reflow / layout shift when opening interactive UI.**
   *Why nothing catches it*: this usually isn't a WCAG rule violation at
   all (unless it crosses into 1.4.10 Reflow territory) — it's a UX
   defect, and axe-core has no opinion on whether a menu should overlay
   or push content.
   *Verify*: Open every dropdown/menu/panel in the UI and confirm it
   behaves the way you intend (typically: overlay content, don't shift
   it — unless a push/reflow is the deliberate design).

7. **Drag interactions have a keyboard equivalent.**
   *Why nothing catches it*: axe-core has no rule requiring an
   alternative input method for pointer-only drag/gesture interactions.
   *Verify*: Identify every drag-based or gesture-based control. Confirm
   each one also works via keyboard alone.

8. **Contrast on states nobody scripted a test for.**
   *Why nothing catches it*: both jest-axe and the real-browser sweep
   only check the render states someone explicitly wrote a test for —
   default, maybe one or two others. Hover, focus, disabled, and error
   states are easy to miss.
   *Verify*: Trigger every hover/focus/disabled/error state in the UI
   and re-check contrast (dev tools color picker, or the project's
   contrast-ratio utility if it has one) against 4.5:1 normal text /
   3:1 large text or UI components.

9. **Motion/vestibular safety beyond `prefers-reduced-motion` existing
   on paper.**
   *Why nothing catches it*: a component can read the media query and
   still ship an animation intense enough to matter, or a new animation
   can be added later without hooking into the existing reduced-motion
   check at all — nothing enforces that at build time.
   *Verify*: Toggle OS-level "reduce motion" (macOS: System Settings →
   Accessibility → Display → Reduce Motion) and confirm every animation
   in the app actually simplifies or stops, including ones added since
   the last check.

10. **Real assistive-tech compatibility on custom widgets.**
    *Why nothing catches it*: axe-core's ruleset approximates
    assistive-tech behavior against the accessibility tree; it does not
    run an actual screen reader against custom components (modals,
    custom dropdowns, comboboxes).
    *Verify*: Operate every custom interactive widget with a real screen
    reader end to end — open, navigate, select, close.

11. **Content and messaging clarity.**
    *Why nothing catches it*: a technically-compliant error message
    (correct role, correct aria attributes) can still be confusing or
    unhelpful — that's a writing quality problem, not a markup problem.
    *Verify*: Read every user-facing message (errors, empty states,
    confirmations) as if encountering it cold, with no visual context.
    Confirm it's understandable on its own.

## How to run this

1. Confirm the dev server is running (or start it) so the developer can
   check items live.
2. Go through the checklist one item at a time. For each, state what
   you're checking and why nothing automated would have caught it, then
   ask the developer to verify it (via `AskUserQuestion` with
   Pass/Fail/Unsure options, or plain conversation if that tool isn't
   available) rather than guessing or marking it done yourself — you
   cannot perform most of these checks (screen readers, real zoom, OS
   motion settings) from inside this session.
3. Record the result for each item as the developer confirms it.
4. Any "Unsure" answer is worth a follow-up question, not a silent pass.

## Report format

```
MANUAL A11Y VERIFICATION RESULTS

1. Skip link / bypass blocks — [pass/fail/unsure]
2. Full-page tab order — [pass/fail/unsure]
3. Focus-visible rendering — [pass/fail/unsure]
4. Screen-reader announcement quality — [pass/fail/unsure]
5. Zoom/200% resize — [pass/fail/unsure]
6. Reflow/layout shift on interactive open — [pass/fail/unsure]
7. Drag interaction keyboard equivalents — [pass/fail/unsure]
8. Contrast on unscripted states — [pass/fail/unsure]
9. Motion/vestibular safety — [pass/fail/unsure]
10. Real assistive-tech compatibility — [pass/fail/unsure]
11. Content/messaging clarity — [pass/fail/unsure]

Follow-up needed: <list of fails/unsures, one line each, with enough
detail to act on later>
```

## Always

End with the developer confirmation gate before committing any fixes
made in response to this checklist. Never auto-commit.
