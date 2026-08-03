# Frontend Standards — ResearchPulse

Read this before writing any frontend component.

## Stack
- React 19 + TypeScript + Vite 8
- SCSS modules — one `.module.scss` per component, no exceptions
- NO Tailwind — pure SCSS only
- Radix UI for accessible primitives
- Framer Motion for animations
- Jest + React Testing Library for tests

## Component Conventions
- File naming: kebab-case (`search-bar.tsx`, `article-card.tsx`)
- Component naming: PascalCase (`SearchBar`, `ArticleCard`)
- One component per file
- Props interface typed explicitly above component
- Default export for components, named exports for hooks and utils

```tsx
interface SearchBarProps {
  onSearch: (query: string) => void
  isLoading?: boolean
}

export default function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
  ...
}
```

## SCSS Modules
- One `.module.scss` per component, lives next to the component file
- camelCase class names — no BEM, modules handle scoping
- No inline styles ever
- Every module starts with:

```scss
@use '@/styles/_variables.scss' as *;
@use '@/styles/_mixins.scss' as *;
```

## Mobile-First
Always min-width, never max-width:

```scss
.element {
  padding: 1rem;        // mobile base
  @include desktop {
    padding: 3rem;      // desktop override
  }
}
```

## TypeScript
- Use `interface` for objects that might be extended
- Use `type` for unions and aliases
- Never use `any` — use `unknown` or proper typing
- Type event handlers explicitly:

```tsx
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {}
const handleSubmit = (e: React.FormEvent) => {}
```

## Testing
- Red-green applies to every test you write, not just `/4-tdd` feature
  builds: after writing an assertion, temporarily break the behavior it
  claims to cover, confirm the test fails for that reason, then restore
  and confirm it passes. A test that's never been red is unverified —
  it could be passing vacuously (weak selector, wrong assertion) and
  there'd be no way to know
- This applies just as much when backfilling tests onto already-shipped
  code (increasing coverage, not building a new feature) as it does to
  a fresh `/4-tdd` build — it's just as easy to write a vacuous test
  against existing code as against new code

## API Calls
- All API calls go through `src/utils/api.ts`
- Never call `fetch` directly in a component
- Use `VITE_API_URL` env variable — never hardcode localhost

```ts
const BASE_URL = import.meta.env.VITE_API_URL

export async function searchArticles(query: string) {
  const res = await fetch(`${BASE_URL}/api/search/?q=${query}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}
```

## Framer Motion
Define variants outside components:

```tsx
const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
} as const
```

Always respect reduced motion:

```tsx
const reduced = useReducedMotion()
<motion.div
  variants={fadeIn}
  initial={reduced ? 'visible' : 'hidden'}
  animate="visible"
>
```

**Stateful async processes** (animation loops, retry sequences,
multi-step flows) need their state-transition logic kept separate from
the side-effecting calls that drive it. If a hook decides what happens
next by directly `await`ing an animation promise (e.g. a loop that
awaits `controls.start()` to know when to move to the next phase), the
state machine and the animation execution become inseparable — and
untestable without mocking Framer Motion's internals, which breaks
easily (`AnimationControls` isn't a plain value; other props on the
same element depend on its real shape). Prefer: a pure function that
answers "given the current phase and this event, what's the next
phase," with a thin effect layer that calls `controls.start()`/`.stop()`
in response. The pure part is trivially unit-testable with zero
mocking; the thin part is left to a smoke test.

## States Every Async Component Must Handle
- Loading — skeleton or spinner
- Empty — friendly message, not blank
- Error — distinct message with retry action
- Success — the actual content

## Folder Structure
```
src/
  components/
    layout/     # Nav, Footer
    sections/   # SearchBar, ArticleList, ArticleDetail
    ui/         # Button, Card, Modal — reusable primitives
  hooks/        # Custom React hooks
  styles/       # globals.scss, _variables.scss, _mixins.scss
  types/        # Shared TypeScript interfaces
  utils/        # api.ts and pure helper functions
  assets/
```