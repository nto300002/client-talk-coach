# 010 - Post-Practice Self Review

## Purpose

Ensure the user's own reflection is captured before AI feedback influences perception.

## Scope

- Post-practice tension and confidence.
- Subjective completion checks.
- Free-text reflection.
- Difference calculation.
- Persistence.
- Blocking result screen until self-review is saved.

## TDD Premise

Validation and flow-order tests are written before UI implementation.

## Acceptance Requirements

- Post-practice self-review appears before AI feedback.
- Tension and confidence accept only integers from 0 to 10.
- Completion checkboxes can be saved.
- Free text respects max length.
- Pre/post tension and confidence differences are calculated.
- Result screen cannot be opened before self-review is saved.
- Self-review is linked to the session.

## Test Requirements

### Unit Test

- Self-review schema accepts valid values.
- Invalid values are rejected.
- Difference calculation handles improvement, no change, and worsening.

### Component Test

- Submit button is disabled until required fields are valid.
- Validation messages appear for invalid input.
- Free-text length limit is enforced.

### E2E Test

1. Start the environment.
2. Complete a mocked practice session.
3. Confirm self-review appears before result.
4. Save self-review.
5. Confirm result screen becomes available.

## Required Final Verification

- Start the environment.
- Run self-review tests.
- Run post-practice flow E2E test.

