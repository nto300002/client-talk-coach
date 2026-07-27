# 019 - Screen Detail Behavior Implementation

## Purpose

Implement screen-specific behavior according to `docs/screen-detail-design.md`.

## Scope

- SCR-001 to SCR-019 normal user screens.
- SCR-101 to SCR-104 admin experiment screens.
- Common dialogs.
- Common error display.
- Screen-specific API / Use Case / Repository / Browser API boundaries.

## TDD Premise

For each screen, write behavior tests from its detailed specification before implementing UI behavior. Do not move business rules into Presentation.

## Acceptance Requirements

- Every screen has the purpose, display data, buttons, processing target, and acceptance behavior described in the design.
- HTTP API calls are limited to documented API boundaries.
- Local persistence actions go through repository/application ports.
- Browser APIs are accessed through Infrastructure facades.
- Self-review always appears before AI feedback.
- Emergency end dialog never uses failure wording.
- Recording limit dialogs match the 20-recording requirement.
- Common error display hides raw technical errors and private data.

## Test Requirements

### Unit Test

- View model builders produce expected screen state.
- Screen-specific action handlers call the correct use case.
- Error mapping produces safe user-facing messages.

### Component Test

- Each screen renders required display data from fixture view models.
- Buttons are disabled when preconditions are missing.
- Dialogs display correct copy and actions.

### E2E Test

1. Start the environment.
2. Execute the full normal practice flow.
3. Execute emergency end flow.
4. Execute recording limit all-favorites flow.
5. Execute admin scenario edit and evaluation comparison smoke flow.

## Required Final Verification

- Start the environment.
- Run screen behavior unit and component tests.
- Run screen behavior E2E tests.

