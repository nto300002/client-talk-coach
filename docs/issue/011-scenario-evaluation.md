# 011 - Scenario-Specific Evaluation

## Purpose

Evaluate captured requirements and missing critical items using deterministic scenario state and fact IDs.

## Scope

- Scenario evaluation domain service.
- Captured fact aggregation.
- Missing critical fact detection.
- Contradiction confirmation.
- Agreement and follow-up item extraction from state.
- Fixture-based evaluation tests.

## TDD Premise

Scenario evaluation must be deterministic. LLM output may suggest evidence, but cannot alone mark facts as captured.

## Acceptance Requirements

- Each scenario uses its own rubric.
- Captured facts are listed.
- Missing critical facts are listed first.
- Requirement capture is based on scenario state and fact IDs.
- Same finalized state always returns same evaluation.
- Previous scenario versions do not rewrite historical evaluation.
- Evaluation result includes evidence references where available.

## Test Requirements

### Unit Test

- Initial interview evaluates purpose, workflow, users, deadline, budget, personal information, permissions, and data migration.
- Scope change evaluates purpose, impact, cost, delivery date, alternatives, and response deadline.
- Delay explanation evaluates delayed item, reason, impact, countermeasure, new deadline, and next report date.
- Missing critical facts outrank normal missing facts.
- Nonexistent fact IDs are rejected or ignored according to schema rule.

### Integration Test

- Finalized scenario state produces persisted evaluation.
- Re-evaluating same state returns same result.
- Historical scenario version is used for old sessions.

### E2E Test

1. Start the environment.
2. Complete a mocked initial interview.
3. Ask only some required questions.
4. Confirm captured and missing items display correctly.

## Required Final Verification

- Start the environment.
- Run scenario evaluation tests.
- Run scenario result E2E test.

