# 006 - Camera Microphone Check And Recording Facade

## Purpose

Implement media-device readiness checks and recording through an Infrastructure facade so browser APIs are testable and replaceable.

## Scope

- Camera and microphone permission flow.
- Preview stream.
- Microphone level check.
- Storage readiness check.
- Recording start, pause, resume, stop.
- Chunk generation and persistence integration.
- Recovery candidate creation.

## TDD Premise

Use mocked `MediaStream`, `MediaRecorder`, and storage ports in tests. Browser-specific behavior should be hidden behind adapter interfaces.

## Acceptance Requirements

- Camera and microphone permission are requested before practice.
- Preview appears after permission.
- Low microphone level shows a warning.
- Camera denial blocks recording practice.
- Microphone denial blocks AI voice practice.
- Recording starts with practice start.
- Recording state is visible.
- Recording chunks are saved in order.
- Stopping produces playable data when browser support allows it.
- Unexpected interruption creates recoverable recording metadata.

## Test Requirements

### Unit Test

- Device state classifier returns ready, warning, or blocked.
- Low volume baseline detection works.
- Recording state machine rejects duplicate start.
- Chunk ordering is stable.

### Integration Test

- Mock media stream can start and stop recording.
- Chunk save failures are retried or marked recoverable.
- All media tracks stop on teardown.

### E2E Test

1. Start the environment.
2. Open device check with browser media mocks.
3. Confirm preview and microphone readiness.
4. Start recording.
5. Stop recording.
6. Confirm local playback or recording placeholder is available.

## Required Final Verification

- Start the environment.
- Run media facade tests.
- Run browser E2E with mocked camera and microphone.

