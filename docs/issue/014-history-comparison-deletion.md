# 014 - History Previous Comparison And Deletion UX

## Purpose

Provide local practice history, previous-session comparison, and safe deletion UX while preserving analysis when videos are removed.

## Scope

- History list.
- Filter or grouping by scenario conditions.
- Previous matching session lookup.
- Deleted-video display.
- Manual video deletion.
- Session deletion.
- All-data deletion.

## TDD Premise

History comparison and deletion effects must be tested before UI implementation. Destructive actions require explicit confirmation.

## Acceptance Requirements

- History is sorted newest first.
- Each entry shows date, situation, scene, difficulty, client type, duration, and recording availability.
- Previous comparison uses latest session with same situation, scene, difficulty, and client type.
- If no previous matching session exists, the result says it is the first attempt for that condition.
- Recording-limit deleted videos show the storage-limit deletion reason.
- Manual video deletion keeps session, self-review, and analysis.
- Session deletion removes related session data.
- All-data deletion removes all local data after confirmation.

## Test Requirements

### Unit Test

- Previous matching session selector ignores different scenario conditions.
- Sort order is newest first.
- Deletion reason maps to correct user-facing message.

### Integration Test

- Manual video deletion removes chunks but keeps analysis.
- Session deletion removes related session data.
- All-data deletion clears every local table.

### E2E Test

1. Start the environment.
2. Create or seed multiple sessions.
3. Open history.
4. Confirm previous comparison.
5. Delete only a video.
6. Confirm analysis remains.
7. Delete a session after confirmation.

## Required Final Verification

- Start the environment.
- Run history and deletion tests.
- Run history E2E test.

