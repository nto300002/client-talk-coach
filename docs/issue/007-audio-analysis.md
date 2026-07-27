# 007 - Audio Analysis Pipeline

## Purpose

Analyze local audio characteristics without sending raw video to external services.

## Scope

- Web Audio / AudioWorklet abstraction.
- Voice activity detection helper.
- Volume baseline.
- Low-volume interval detection.
- Silence detection.
- Response delay.
- Speaking speed from Japanese transcript.
- Filler detection.
- Overlap with AI speech.
- Timestamped audio markers.

## TDD Premise

Audio metrics should be implemented as pure functions where possible. Browser audio processing is wrapped behind a port and tested with synthetic samples.

## Acceptance Requirements

- Silent intervals are not counted as speech.
- Low-volume intervals are detected against personal baseline.
- Long silence is detected with timestamps.
- First response delay is measured.
- Speaking speed is calculated from transcript length and speech duration.
- Fillers are detected without excessive false positives.
- AI/user speech overlap is detected.
- Every audio marker includes timestamp and category.

## Test Requirements

### Unit Test

- RMS calculation handles silence and non-silence.
- Threshold boundary behavior is deterministic.
- Silence detection merges or separates intervals according to rule.
- Japanese character count excludes punctuation where specified.
- Filler dictionary detects standalone filler expressions.
- Overlap calculation handles partial and full overlaps.

### Integration Test

- Audio analyzer processes a 10-minute synthetic fixture within acceptable time.
- Analyzer output can be saved and loaded through persistence port.

### E2E Test

1. Start the environment.
2. Run a mocked practice session with fixture audio metrics.
3. End practice.
4. Confirm audio analysis markers appear in results.

## Required Final Verification

- Start the environment.
- Run audio unit and integration tests.
- Run audio-result E2E test.

