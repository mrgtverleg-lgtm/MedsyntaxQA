# CLAUDE.md

## Testing

- Every change comes with new or updated Playwright tests in `playwright/` that cover it.
- Run only the tests for that change, for example `npx playwright test playwright/<file>.spec.ts` or `-g "<test name>"`.
- Do not run the entire test suite (`npm run pw-test` / `npx playwright test` without a file) unless the user asks for it.
