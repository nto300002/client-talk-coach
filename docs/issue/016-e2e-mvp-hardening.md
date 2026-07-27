# 016 - End-To-End MVP Hardening

## Purpose

Validate the complete personal MVP flow with mocked media and AI services, then document remaining production connection checks.

## Scope

- Full happy-path E2E.
- API failure E2E.
- Storage limit E2E.
- Emergency end E2E.
- Deleted-video history E2E.
- Production connection smoke test documentation.
- Privacy-safe logging review.

## TDD Premise

E2E tests should be written before final hardening work. Tests use deterministic mocks by default and opt-in production smoke tests separately.

## Acceptance Requirements

- Full setup to history flow passes.
- Practice can complete with mocked STT, AI, TTS, media, and IndexedDB.
- AI API failure can be retried and safely ended.
- STT failure can be retried and safely ended.
- Recording-limit behavior works in browser E2E.
- Emergency end preserves recoverable data.
- Video deletion does not delete analysis.
- Logs do not contain transcript, video, audio, self-review, or private evaluation data.
- Production connection smoke tests for STT and AI are documented and runnable with non-private test data.

## Test Requirements

### E2E Test

1. Start the environment.
2. Select situation, scene, difficulty, client type, focus skill, and duration.
3. Enter pre-practice tension and confidence.
4. Complete media check.
5. Start practice and recording.
6. Complete mocked AI conversation.
7. End practice.
8. Save post-practice self-review.
9. Confirm audio, conversation, and scenario evaluation appear.
10. Confirm strengths and exactly one improvement appear.
11. Start partial retry.
12. Complete retry.
13. Confirm history contains the session and retry.

### Failure E2E

- AI failure retries, then safe end.
- STT failure retries, then safe end.
- Recording save failure preserves existing recordings.
- 20 favorite recordings block new recording start.

### Production Smoke Test

- STT provider connection is checked with non-private test audio.
- AI provider connection is checked with non-private prompt.
- Smoke tests never send user recordings, real transcripts, or self-review data.

## Required Final Verification

- Start the environment.
- Run full E2E suite.
- Run relevant unit and integration suites.
- Run or document production connection smoke tests.
- Document any skipped tests with reason and follow-up.

