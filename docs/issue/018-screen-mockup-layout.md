# 018 - Screen Mockup Layout Implementation

## Purpose

Implement the first UI layouts using the text mockups in `docs/screen-mockups.md` as the source of truth.

## Scope

- Home screen.
- Situation selection.
- Practice options.
- Device check.
- AI client practice.
- Post-practice self-review.
- Result screen.
- Responsive layout constraints for PC-first use.

## TDD Premise

Component tests should be written before layout implementation. Visual structure should be verified with Playwright screenshots where practical.

## Acceptance Requirements

- Each screen has one primary purpose.
- Each screen has one primary action where possible.
- Home shows previous session summary, start practice, history, recordings, recording count, and recovery notice if present.
- Situation selection shows the 11 situations.
- Practice options show difficulty, client type, focus skill, and duration.
- Device check shows camera preview, microphone state, and storage state.
- Practice screen shows only recording state, AI state, elapsed time, pause, and end controls.
- Result screen shows strengths before one primary improvement.
- Text does not overflow buttons or panels.
- Layout works at common desktop widths.

## Test Requirements

### Component Test

- Home renders main start action and secondary links.
- Situation selection renders all enabled options.
- Practice options render default duration as 7 minutes.
- Device check renders readiness states.
- Practice screen does not render detailed scoring.
- Result screen renders strengths before improvement.

### E2E Test

1. Start the environment.
2. Visit each implemented screen with fixture state.
3. Capture or inspect layout at desktop viewport.
4. Confirm primary actions are visible and usable.
5. Confirm no text overlap or critical overflow is visible.

## Required Final Verification

- Start the environment.
- Run component tests.
- Run screen-layout E2E tests.
- Inspect screenshots for the main screens.

