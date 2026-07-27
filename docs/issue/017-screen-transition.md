# 017 - Screen Transition Implementation

## Purpose

Implement the MVP screen routes and navigation flow according to `docs/screen-transition-diagram.md`.

## Scope

- Normal practice flow routes.
- History and recording management routes.
- Recovery route.
- Admin experiment mode routes.
- Route guards for invalid or incomplete state.
- Navigation behavior after normal end, time end, emergency end, and analysis failure.

## TDD Premise

Route and navigation behavior is tested before screen implementation. UI pages should call Application use cases; routing must not duplicate domain rules.

## Acceptance Requirements

- The route list matches the screen design document.
- Setup screens proceed in the expected order.
- Practice end always routes to post-practice self-review before analysis or result.
- Analysis failure still routes to result with available fallback data.
- Result can route to video review, partial retry setup, history, or home.
- Recovery flow can route to history or new practice with same settings.
- Admin routes are separated from normal practice flow.
- Invalid direct URL access shows safe fallback or redirects to the correct previous step.

## Test Requirements

### Unit Test

- Route constants map to expected paths.
- Navigation decision function returns correct next route for each practice state.
- Invalid state returns safe fallback route.

### Component Test

- Navigation buttons call expected route transitions.
- Disabled navigation is shown for incomplete setup.

### E2E Test

1. Start the environment.
2. Navigate from home through setup, device check, ready, practice, self-review, analysis, and result.
3. Trigger emergency end and confirm it still goes to post-practice self-review.
4. Navigate from result to video review and partial retry setup.
5. Navigate from home to history, recordings, recovery, and admin.

## Required Final Verification

- Start the environment.
- Run route unit tests.
- Run navigation E2E tests.

