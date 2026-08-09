# Frontend Testing Patterns

Testing patterns for React Testing Library, Jest, and jest-axe assertions.

---

## Core Unit Test Structure

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Button } from './Button'

expect.extend(toHaveNoViolations)

describe('Button', () => {
  it('renders label correctly and passes accessibility audit', async () => {
    const { container } = render(<Button label="Submit" />)
    
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('triggers onClick handler when clicked', async () => {
    const handleClick = jest.fn()
    render(<Button label="Click Me" onClick={handleClick} />)
    
    await userEvent.click(screen.getByRole('button', { name: /click me/i }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

---

## jest-axe Multi-State Assertion Rule

Test every distinct render state (default, disabled, loading, active, error) with `jest-axe`:

```tsx
it('has no accessibility violations in disabled state', async () => {
  const { container } = render(<Button label="Disabled" disabled />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

---

## Red-Green Discipline Check
Before concluding a test, verify red-green:
1. Temporarily break component logic (e.g. comment out text render or label).
2. Run `npm test -- <test-file>` -> confirm test fails.
3. Restore component code -> confirm test turns green.
