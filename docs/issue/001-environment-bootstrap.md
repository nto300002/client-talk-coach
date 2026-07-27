# 001 - Environment Bootstrap And Production Connection Smoke Tests

## Purpose

Create the initial Next.js application foundation and verify from the start that both the local test app and production-facing external connection paths can work.

This issue exists before feature work so later issues do not discover environment or API-key problems late.

## Scope

- Initialize the app with Next.js App Router and TypeScript.
- Add the agreed test stack.
- Add baseline architecture directories.
- Add environment variable validation.
- Add mock mode for tests.
- Add production connection smoke tests for external providers.
- Add a tiny test app screen used only to confirm the runtime works.

## TDD Premise

Tests are written before implementation. Environment validation and smoke checks should be testable without calling paid APIs by default. Real provider connection tests must be opt-in and documented.

## Acceptance Requirements

- The app starts locally with `npm run dev`.
- The test app page renders in the browser.
- `npm test` or equivalent unit test command runs successfully.
- Playwright can open the local app and assert the test page is visible.
- Environment variables are validated at startup or before provider calls.
- Missing required production variables produce safe, actionable errors.
- Mock AI/STT/TTS mode works without external API keys.
- Production connection smoke tests are available from the beginning.
- The production connection test checks credentials and minimal provider reachability without sending private user data.
- The smoke test result clearly distinguishes local mock success from real provider connection success.

## Test Requirements

### Unit Test

- Environment schema accepts valid local mock configuration.
- Environment schema rejects missing production API keys when production smoke mode is requested.
- Safe error mapping hides secret values.

### Integration Test

- Provider smoke-test command can run in mock mode.
- Provider smoke-test command reports skipped or missing credentials safely.
- Production connection smoke tests call only minimal, non-private test payloads.

### E2E Test

1. Start the local dev environment.
2. Open the test app page.
3. Confirm the page renders.
4. Confirm mock provider status is shown.
5. Run the E2E test against the running local app.

## Required Final Verification

- Start the environment.
- Run unit tests.
- Run E2E tests.
- Run mock provider smoke test.
- Run or document the production connection smoke test result.

