# 003 - Practice Setup Flow

## Purpose

Implement the user-facing setup flow for selecting practice conditions before recording or AI conversation starts.

## Scope

- Situation selection.
- Concrete scene selection.
- Difficulty selection.
- Client type selection.
- Focus skill selection.
- Duration selection.
- Pre-practice tension and confidence input.

## TDD Premise

Write component and state tests before UI implementation. Domain compatibility rules must be tested separately from React components.

## Acceptance Requirements

- The user can select exactly one situation.
- The user can select only scenes belonging to the selected situation.
- Changing situation clears incompatible scene selection.
- The user can select only compatible difficulty and client type options.
- The user can choose one focus skill or "let the app choose".
- Duration is limited to 5, 7, or 10 minutes, defaulting to 7.
- Tension and confidence accept only integers from 0 to 10.
- The start button is disabled until required setup fields are valid.
- The selected setup is passed to the Application use case as a typed configuration.

## Test Requirements

### Unit Test

- Setup validator rejects incomplete setup.
- Compatibility rules reject invalid scene, difficulty, and client type combinations.
- Auto focus skill uses history when available and scenario default otherwise.
- Duration validator rejects unsupported values.

### Component Test

- Selecting one option updates selected visual state.
- Changing parent selection clears dependent invalid selection.
- Invalid pre-practice values show validation messages.
- Start button becomes enabled only when the setup is complete.

### E2E Test

1. Start the environment.
2. Open practice setup.
3. Select scenario, scene, difficulty, client type, focus skill, and duration.
4. Enter tension and confidence.
5. Confirm the flow reaches camera and microphone check.

## Required Final Verification

- Start the environment.
- Run unit and component tests.
- Run setup-flow E2E test.

