# 020 - Light Orange Visual Design System

## Purpose

Implement the visual design rules in `docs/screen-visual-design.md`, with an overall light orange theme.

## Scope

- Theme tokens.
- Color palette.
- Button variants.
- Selection chips.
- Form inputs.
- Warnings and destructive actions.
- Result and feedback surfaces.
- Accessibility checks for contrast and focus.

## TDD Premise

Design tokens and component variants should have unit/component tests where possible. Visual regressions should be checked through Playwright screenshots.

## Acceptance Requirements

- Page background uses a light orange base.
- Primary actions use the orange primary color.
- Selection states use orange border and light orange fill.
- Warning states use amber/orange rather than harsh red unless the action is destructive.
- Destructive actions require confirmation and use restrained red text.
- Cards use 8px radius or less.
- UI does not use nested cards.
- Text remains readable on light orange backgrounds.
- Focus states are visible.
- The practice screen stays calm and does not show scoring warnings during conversation.

## Test Requirements

### Unit Test

- Theme token names resolve to expected color values.
- Button variant config returns primary, secondary, warning, and destructive styles.

### Component Test

- Primary button uses orange styling.
- Selected option uses orange border/fill.
- Warning panel uses amber/orange styling.
- Destructive action requires confirmation dialog.

### E2E Test

1. Start the environment.
2. Open core screens.
3. Capture desktop screenshots.
4. Confirm the overall theme reads as light orange.
5. Confirm focus states are visible.
6. Confirm text and controls do not overlap.

## Required Final Verification

- Start the environment.
- Run theme/component tests.
- Run visual E2E screenshot checks.

