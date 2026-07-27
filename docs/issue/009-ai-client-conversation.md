# 009 - AI Client Response Flow And Scenario State Updates

## Purpose

Implement AI client conversation generation while ensuring the app, not the AI, owns scenario truth and fact state.

## Scope

- `AiClientPort`.
- Prompt/context builder.
- Scenario state update rules.
- Hidden fact disclosure.
- Client type and difficulty behavior.
- Browser SpeechSynthesis TTS adapter.
- Response validation.
- Retry and fallback behavior.

## TDD Premise

Application tests use a deterministic mock AI client. AI fixture tests check structure and constraints, not exact wording.

## Acceptance Requirements

- AI responses are normally 1 to 3 sentences.
- AI asks no more than one question at a time.
- AI does not reveal hidden facts before disclosure conditions.
- AI does not invent important scenario facts.
- Correct user questions make matching facts eligible for disclosure.
- Client type affects tone and detail level.
- Difficulty affects ambiguity, pressure, and hidden information.
- TTS reads the response when available.
- If TTS fails, text response remains visible.
- AI errors are retryable when safe.

## Test Requirements

### Unit Test

- Context builder excludes undisclosed hidden facts unless eligible.
- Context builder includes recent turns and scenario state.
- Response validator rejects multiple questions when not allowed.
- Response validator rejects prohibited behavior markers.
- Scenario state updates are idempotent.

### Integration Test

- Mock STT plus mock AI produces a complete conversation turn.
- AI failure triggers retry and then safe fallback.
- TTS failure displays text fallback.

### E2E Test

1. Start the environment.
2. Run practice with mocked STT and AI.
3. Ask a question that should disclose a fact.
4. Confirm the AI response and scenario state update.
5. Confirm no hidden fact is leaked before the question.

## Required Final Verification

- Start the environment.
- Run AI context and state tests.
- Run conversation E2E test.
- Run or document production AI connection smoke test with non-private prompt.

