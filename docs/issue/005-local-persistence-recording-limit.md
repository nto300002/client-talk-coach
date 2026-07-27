# 005 - Local Persistence With IndexedDB And Recording Limit

## Purpose

Implement local-first persistence for sessions, recordings, chunks, self-review, analysis, history, and the 20-recording limit.

## Scope

- Dexie/IndexedDB infrastructure adapter.
- Repository ports.
- Recording metadata model.
- Recording chunks.
- 30-day retention.
- 20 completed recording limit.
- Favorite behavior.
- Recoverable recording exclusion.
- Manual video deletion.
- Delete all data.

## TDD Premise

Persistence behavior must be tested with repositories and integration tests before UI depends on it. Deletion candidate selection should be a pure function with unit tests.

## Acceptance Requirements

- Completed recording count never exceeds 20.
- With 19 recordings, no existing recording is deleted.
- On the 21st recording, the oldest non-favorite completed recording is deleted after the new recording is saved.
- If new recording save fails, no existing recording is deleted.
- All-favorite 20-recording state blocks new recording start.
- Recoverable recordings are not counted toward the 20 limit.
- Recording-limit deletion deletes metadata/chunks only.
- Practice history, self-review, and analysis remain after video deletion.
- Manual video deletion keeps history and analysis.
- Delete all data removes all local data after confirmation.

## Test Requirements

### Unit Test

- 19 recordings returns no deletion candidate.
- 20 recordings returns oldest non-favorite candidate.
- Equal timestamps use stable secondary key.
- Favorites are excluded.
- All favorites returns `RecordingLimitReachedError`.
- Recoverable recordings are excluded from count.

### Integration Test

- New save followed by limit cleanup deletes only old video metadata and chunks.
- New save failure skips deletion transaction.
- Partial deletion failure preserves IndexedDB consistency.
- Re-sending the same save request deletes only once.
- Manual video deletion preserves session and analysis records.

### E2E Test

1. Start the environment.
2. Create or seed 20 recordings.
3. Mark one or more recordings as favorite.
4. Save the 21st recording.
5. Confirm the oldest non-favorite video is not playable.
6. Confirm its analysis remains visible.
7. Confirm saved recording count is 20.
8. Confirm all-favorite state blocks new recording start.

## Required Final Verification

- Start the environment.
- Run persistence unit tests.
- Run IndexedDB integration tests.
- Run recording-limit E2E test.

