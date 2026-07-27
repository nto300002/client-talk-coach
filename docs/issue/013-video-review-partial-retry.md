# 013 - Video Review And Partial Retry

## Purpose

Let the user privately review recording markers and retry the one most important improvement in a short focused exercise.

## Scope

- Video playback from local recording.
- Marker timeline.
- Deleted-video fallback.
- Text/audio-only review option.
- Partial retry task generation.
- Retry session persistence.
- Original vs retry comparison.

## TDD Premise

Marker mapping and retry task selection are tested as pure logic. Browser playback is tested with E2E where possible.

## Acceptance Requirements

- Saved recording can be played locally.
- Markers are sorted by time.
- Selecting a marker seeks to the correct time.
- Good markers and improvement markers are distinct.
- If video is deleted, analysis remains visible.
- The user can skip watching video and review text/audio metrics.
- Partial retry duration is 30 seconds to 2 minutes.
- Retry is linked to original session.
- Retry result is stored separately from full practice.
- Same retry can be attempted multiple times.

## Test Requirements

### Unit Test

- Marker sorting is stable.
- Marker time maps to valid video seek position.
- Retry template matches improvement category.
- Retry duration is within allowed range.
- Retry count increments.

### Integration Test

- Video metadata and markers load by session ID.
- Deleted-video state displays fallback UI.
- Retry session links to original session.

### E2E Test

1. Start the environment.
2. Open a completed session with recording.
3. Click a marker.
4. Confirm playback position changes.
5. Start partial retry.
6. Complete retry.
7. Confirm retry is linked to original.

## Required Final Verification

- Start the environment.
- Run marker and retry tests.
- Run video review and retry E2E test.

