# Accessibility Checklist — Section 508

Run through this before writing any frontend tests.
Every item must pass before committing.

IMPORTANT: we should be using best accessiblity practices on frontend.

## Semantic HTML
- [ ] Correct elements used — `nav`, `main`, `section`, `button`, `input`
- [ ] No `div` used where a semantic element exists
- [ ] Heading hierarchy is logical — h1 → h2 → h3, never skipped

## Landmarks
- [ ] `<nav>` wraps navigation
- [ ] `<main>` wraps primary content — only one per page
- [ ] Every `<section>` has `aria-labelledby` pointing to its heading id
- [ ] Skip to content link is first focusable element on page

## Interactive Elements
- [ ] Every icon-only button has `aria-label`
- [ ] Every form input has explicit `<label>` with matching `htmlFor`/`id`
- [ ] All interactive elements reachable by Tab key
- [ ] Tab order is logical — follows visual reading order
- [ ] Enter and Space activate buttons
- [ ] Escape closes modals and dropdowns
- [ ] `<nav>` is wrapped in `<header>` landmark
- [ ] Brand/logo links to home with aria-label
- [ ] Skip link is visually hidden until focused — not display:none
- [ ] `<html lang="en">` present in index.html

## Focus
- [ ] `:focus-visible` styles defined and visible
- [ ] Focus never trapped outside a modal
- [ ] Modal returns focus to trigger element on close

## Dynamic Content
- [ ] Loading states announced — use `aria-live="polite"` or `role="status"`
- [ ] Error messages use `role="alert"` for immediate announcement
- [ ] Dynamic results announced — `aria-live="polite"` on results container

## Color and Contrast
- [ ] Text contrast ratio minimum 4.5:1 against background — don't eyeball
      this. jest-axe runs in jsdom, which doesn't paint or lay out the
      page, so it cannot verify real contrast either. `npm run test:a11y`
      (real-browser Playwright + axe sweep, required at pre-commit) is the
      only thing in the flow that actually checks this
- [ ] Interactive element contrast minimum 3:1
- [ ] Information never conveyed by color alone

## Images and Icons
- [ ] Decorative images have `aria-hidden="true"`
- [ ] Informative images have descriptive `alt` text
- [ ] SVG icons used as buttons have `aria-label` on the button

## Animations
- [ ] All animations respect `prefers-reduced-motion`
- [ ] No content flashes more than 3 times per second