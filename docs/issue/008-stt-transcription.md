# 008 - STT Adapter And Transcription Flow

## Purpose

Implement the speech-to-text boundary for user utterances while keeping provider details out of Application and Domain layers.

## Scope

- `TranscriptionPort`.
- Mock transcription adapter.
- Google STT adapter or route handler boundary.
- Utterance segmentation.
- Request/response schema validation.
- Retry and timeout behavior.
- Safe error mapping.

## TDD Premise

Application tests must use a mock transcription port. Provider connection tests are separate smoke tests and must use non-private test audio.

## Acceptance Requirements

- User utterance audio can be sent for transcription.
- Silence is not sent when avoidable.
- STT response is normalized into typed transcript turns.
- Provider errors map to safe application errors.
- Retry occurs only for retryable errors.
- Raw audio and transcript are not written to error logs.
- Mock transcription works in E2E tests without API keys.
- Production STT connection smoke test exists and uses test data only.

## Test Requirements

### Unit Test

- Transcription response schema accepts valid output.
- Invalid provider output is rejected.
- Retry policy identifies retryable and non-retryable errors.
- Error sanitizer removes transcript and secret values.

### Integration Test

- Mock adapter transcribes fixture audio.
- Route handler validates request payload.
- Production smoke command reports missing credentials safely.

### E2E Test

1. Start the environment.
2. Run practice with mocked STT.
3. Speak or inject fixture utterance.
4. Confirm transcript appears in conversation state.

## Required Final Verification

- Start the environment.
- Run transcription tests.
- Run STT mock E2E.
- Run or document production STT connection smoke test.

