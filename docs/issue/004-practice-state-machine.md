# 004 - Practice State Machine And Session Lifecycle

## Purpose

Implement the practice lifecycle as a deterministic state machine so recording, AI conversation, pause, end, review, analysis, and retry cannot enter inconsistent states.

## Scope

- Session creation.
- State transitions.
- Pause and resume.
- Emergency end.
- Normal end.
- Idempotent end handling.
- Transition to post-practice self-review.

## TDD Premise

State transition tests are written before implementation. UI must consume state; it must not own lifecycle rules.

## Acceptance Requirements

- A session starts from a valid setup only.
- Practice can move from setup to device check to active conversation.
- Pause blocks AI speaking and user-turn processing.
- Resume returns to the same session.
- Emergency end preserves recoverable data.
- End handling is idempotent.
- Post-practice self-review appears before AI feedback.
- Invalid transitions are rejected with typed application errors.

## Test Requirements

### Unit Test

- Valid transitions are accepted.
- Invalid transitions are rejected.
- Ending twice produces one final state.
- Pause during inactive states is rejected.
- Emergency end does not mark the session as failed.

### Integration Test

- End practice calls recording stop, scenario-state freeze, and persistence.
- If recording stop fails, saved state still moves to safe review state when possible.

### E2E Test

1. Start the environment.
2. Complete setup.
3. Enter active practice.
4. Pause and resume.
5. End practice.
6. Confirm post-practice self-review appears.

## Required Final Verification

- Start the environment.
- Run state-machine tests.
- Run lifecycle E2E test.

