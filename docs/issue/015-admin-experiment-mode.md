# 015 - Admin Experiment Mode

## Purpose

Provide a developer-only experiment area for editing and comparing scenarios, prompts, and evaluation behavior without using normal practice data automatically.

## Scope

- Scenario definition editor.
- Prompt version editor.
- JSON/schema validation UI.
- Duplicate scenario.
- Version preservation.
- Evaluation comparison with developer-owned fixtures.
- Model setting controls.

## TDD Premise

Schema validation, versioning, and comparison logic are tested before building the editor UI.

## Acceptance Requirements

- Valid scenario definition can be saved.
- Invalid scenario definition is rejected with useful messages.
- Updating a scenario preserves or creates version history.
- Prompt versions can be compared on the same fixture transcript.
- Experiment mode uses developer-created fixtures only.
- Normal practice data is not automatically used for experiments.
- Admin-only screens are clearly separated from normal practice flow.

## Test Requirements

### Unit Test

- Scenario validation rejects missing required fields.
- Scenario validation rejects nonexistent references.
- Version update preserves old version.
- Prompt comparison returns separate results.

### Component Test

- Editor shows validation errors.
- Save is disabled for invalid JSON/schema.
- Comparison view shows multiple prompt results.

### E2E Test

1. Start the environment.
2. Open admin experiment mode.
3. Edit a scenario fixture.
4. Save valid changes.
5. Run comparison against developer fixture.
6. Confirm normal practice history was not used.

## Required Final Verification

- Start the environment.
- Run admin mode tests.
- Run admin E2E test.

