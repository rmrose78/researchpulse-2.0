# Pre-Commit Gate Checklist

Verify all items before proposing a commit or opening a pull request.

---

## Pre-Commit Verification Steps

1. **Build Gate**: `npm run build` succeeds cleanly with zero TypeScript compilation errors.
2. **Lint Gate**: `npm run lint` passes with zero warnings or errors.
3. **Test Gate**: `npm test` runs full suite; 100% tests green.
4. **jest-axe Assertion Gate**: Every new or modified component has a `jest-axe` test for all distinct render states.
5. **No Console Artifacts**: Remove all `console.log` statements before commit proposal.
6. **No Em Dashes**: Confirm zero em dashes in copy, prose, or commit message text.
