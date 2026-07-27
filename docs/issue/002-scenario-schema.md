# 002 - Scenario Definition Schema And Fixture Validation

## Purpose

Define the official scenario schema before implementing scenario behavior. Scenario data must be versioned, validated, and safe to extend without changing common engine code.

## Scope

- Define `ScenarioDefinition`, `ConcreteScene`, `ScenarioFact`, `DifficultyProfile`, `EvaluationRubric`, and related schemas.
- Add fixture data for the first technical MVP scenarios:
  - Initial requirements interview
  - Scope change / additional request
  - Schedule delay explanation
- Add validation for IDs, references, compatibility, and versioning.

## TDD Premise

Schema and validation tests are written first. Invalid scenario definitions should fail before any UI or AI behavior depends on them.

## Acceptance Requirements

- Scenario IDs are stable and separate from display names.
- Scenario and scene versions are stored.
- Fact IDs are unique within a scenario.
- References to nonexistent fact IDs are rejected.
- Difficulty profiles are valid for levels 1 to 5.
- Difficulty level increases do not reduce hidden fact ratio, ambiguity, or pressure.
- Client type compatibility can be validated.
- New scenario data can be added without changing the setup UI.

## Test Requirements

### Unit Test

- Valid scenario fixture passes schema validation.
- Missing required fields fail validation.
- Duplicate fact IDs fail validation.
- Nonexistent fact references fail validation.
- Invalid difficulty ordering fails validation.
- Level 1 disallows strong pressure or abusive behavior.
- Level 5 still disallows discriminatory, insulting, or abusive behavior.

### Integration Test

- Scenario repository loads all enabled scenarios.
- Disabled scenarios are excluded from normal selection.
- Existing session history stores scenario and scene version.

### E2E Test

1. Start the environment.
2. Open the scenario selection page.
3. Confirm the three technical MVP scenarios appear.
4. Confirm disabled or invalid scenario fixtures do not appear.

## Required Final Verification

- Start the environment.
- Run schema tests.
- Run setup-flow E2E test with scenario fixtures.

