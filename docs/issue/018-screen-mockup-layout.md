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

- [x] Each screen has one primary purpose.
- [x] Each screen has one primary action where possible.
- [x] Home shows previous session summary, start practice, history, recordings, recording count, and recovery notice if present.
- [x] Situation selection shows the 11 situations.
- [x] Practice options show difficulty, client type, focus skill, and duration.
- [x] Device check shows camera preview, microphone state, storage state, and current recording count.
- [x] Practice screen shows recording state, AI state, elapsed time, pause, and end controls without detailed scoring.
- [x] Result screen shows strengths before one primary improvement.
- [x] Text does not overflow buttons or panels at the tested desktop width.
- [x] Layout works at a 1280px desktop width.

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

## 実施結果

- ホームの前回練習サマリー、録画保存数、復旧通知を端末内の保存状態から表示するようにした。
- デバイス確認に保存容量、録画数、再確認操作を追加した。
- 練習画面に現在のシナリオ・難易度とAI顧客の待機／応答状態を表示した。
- Unit / Component: ホームダッシュボードの集計と表示をテストした。
- E2E: ホームの主要操作、録画保存数、デバイス確認の保存容量・録画数を確認した。
- Visual: `1280x800`でホームと設定画面を撮影し、横方向のはみ出しやテキスト重なりがないことを確認した。
