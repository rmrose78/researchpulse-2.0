# Accessibility (a11y) Checklist

Mandatory accessibility criteria for every frontend component.

---

## 1. Semantic HTML & ARIA
- [ ] Appropriate HTML5 landmark/sectioning element used (`header`, `nav`, `main`, `footer`, `section`, `article`).
- [ ] Interactive elements are native `<button>` or `<a>` tags.
- [ ] Controls with expandable menus use `aria-expanded` and `aria-controls`.
- [ ] Icons and visual-only decorative elements use `aria-hidden="true"`.

## 2. Keyboard Navigation & Focus
- [ ] All interactive elements are reachable via Tab key.
- [ ] Focus indicator is clearly visible on `:focus-visible`.
- [ ] Custom modals/dialogs trap focus and close on Escape key.

## 3. Color & Contrast
- [ ] Text contrast meets 4.5:1 ratio against background.
- [ ] Large text (18pt / 24px+) or UI boundaries meet 3:1 ratio.
- [ ] State changes (active, selected, error) do not rely solely on color.

## 4. Automated Verification
- [ ] `jest-axe` test assertion added for every distinct render state.
