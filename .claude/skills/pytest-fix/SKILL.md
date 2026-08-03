---
name: pytest-fix
description: Fix failing pytest tests using TDD red-green methodology, with a required 3x-stable-run check and explicit flaky-test handling.
---

# Skill: pytest-fix

Fix failing pytest tests using TDD red-green methodology.

## Process
1. Run `pytest tests/ -v`
2. Identify failing tests
3. Read the failing test to understand expected behavior
4. Read the source code the test is testing
5. Determine if the bug is in the code or the test
6. Fix the SOURCE CODE first — never fix a test to match broken code
7. Use red-green validation:
   - Confirm test fails before fix (red)
   - Apply fix
   - Confirm test passes after fix (green)
8. Run the full suite 3 times in a row, back to back
   - All 3 runs must be 100% green before moving on
   - A single clean run is not sufficient — it can hide flakiness
   - If any run fails, go back to step 3 — do not report success
9. Report what was fixed and why

## Rules
- Never change an assertion to match broken behavior
- Never delete a failing test
- Always fix the implementation, not the test
- If the test itself is wrong, explain why before changing it
- Run full suite after every fix — one fix can break another test
- Never declare a fix done from a single passing run — confirm stability across 3 consecutive full-suite runs (see step 8)

## Flaky Tests
A test that fails intermittently across repeated runs (not on every run) is a distinct
problem from a deterministic failure — do not treat one green run as "fixed."
- Note when a failure looks non-deterministic (e.g. passes alone, fails in the full suite;
  or pass/fail alternates between runs with no code change in between)
- Find the root cause (shared external state, rate limits, timing, test order dependency)
  instead of re-running until it happens to pass
- Report it explicitly as FLAKY, separate from FIXED, with the suspected cause — don't
  bundle it into a report that implies the suite is reliably green

## Report Format
After fixing, report:
```
FIXED: test_name
  Problem: what was wrong
  Fix: what was changed
  Verified: red → green confirmed
```
