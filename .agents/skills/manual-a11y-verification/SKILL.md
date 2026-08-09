---
name: manual-a11y-verification
description: Portable 11-point checklist of human-judgment accessibility items that automated scanners (axe, Lighthouse) cannot verify. Opt-in only.
---

# Skill: manual-a11y-verification

Invoke this skill via `/manual-a11y-verification` to walk through manual accessibility checks requiring human judgment.

---

## 11-Point Manual Checklist

1. **Skip Links**: Verify initial Tab key press reveals visible skip-to-content link that shifts focus to `<main>`.
2. **Full-Page Tab Sequence**: Tab top-to-bottom across full composed page without focus traps or skipped items.
3. **Focus-Visible Indicator**: Confirm focus indicator ring is clearly visible and not clipped by parent `overflow: hidden`.
4. **Screen Reader Audio Clarity**: Test VoiceOver (Cmd+F5) to verify announcements are logical out of visual context.
5. **Zoom to 200%**: Zoom browser to 200% and confirm zero horizontal body scroll or clipped text.
6. **Reflow & Layout Shift**: Confirm dropdowns and modals overlay content cleanly without unintended page shifts.
7. **Drag Interaction Alternatives**: Ensure drag/swipe controls have keyboard-only button alternatives.
8. **Contrast on Interactive States**: Verify contrast on hover, focus, disabled, and active states.
9. **Motion Safety**: Confirm `prefers-reduced-motion` disables heavy CSS animations when enabled in OS settings.
10. **Custom Widget Assistive Tech**: Test custom modal/combobox widgets with real screen reader navigation.
11. **Content Clarity**: Confirm error messages and notifications are clear without visual context.
