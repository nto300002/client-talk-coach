# Issue Plan

This directory contains implementation issue drafts for the personal MVP.

Every issue assumes TDD:

1. Write or update natural-language behavior.
2. Write failing automated tests first.
3. Implement the smallest code needed to pass.
4. Refactor while keeping tests green.
5. Start the local environment and run E2E tests before completion.

## Common Done Criteria For Every Issue

- The local development environment is started before final verification.
- Relevant unit, component, integration, and E2E tests are run.
- At least one E2E path related to the changed behavior is executed.
- If external AI/STT/TTS is involved, mock tests and connection tests are both documented.
- No test or error log contains raw transcript, video, audio, self-review, or private analysis data.
- The implementation follows the Presentation / Application / Domain / Infrastructure dependency direction.

## Issue List

1. [001 - Environment Bootstrap And Production Connection Smoke Tests](001-environment-bootstrap.md)
2. [002 - Scenario Definition Schema And Fixture Validation](002-scenario-schema.md)
3. [003 - Practice Setup Flow](003-practice-setup-flow.md)
4. [004 - Practice State Machine And Session Lifecycle](004-practice-state-machine.md)
5. [005 - Local Persistence With IndexedDB And Recording Limit](005-local-persistence-recording-limit.md)
6. [006 - Camera Microphone Check And Recording Facade](006-media-recording.md)
7. [007 - Audio Analysis Pipeline](007-audio-analysis.md)
8. [008 - STT Adapter And Transcription Flow](008-stt-transcription.md)
9. [009 - AI Client Response Flow And Scenario State Updates](009-ai-client-conversation.md)
10. [010 - Post-Practice Self Review](010-post-practice-self-review.md)
11. [011 - Scenario-Specific Evaluation](011-scenario-evaluation.md)
12. [012 - Conversation Analysis And Feedback Generation](012-conversation-analysis-feedback.md)
13. [013 - Video Review And Partial Retry](013-video-review-partial-retry.md)
14. [014 - History Previous Comparison And Deletion UX](014-history-comparison-deletion.md)
15. [015 - Admin Experiment Mode](015-admin-experiment-mode.md)
16. [016 - End-To-End MVP Hardening](016-e2e-mvp-hardening.md)
17. [017 - Screen Transition Implementation](017-screen-transition.md)
18. [018 - Screen Mockup Layout Implementation](018-screen-mockup-layout.md)
19. [019 - Screen Detail Behavior Implementation](019-screen-detail-behavior.md)
20. [020 - Light Orange Visual Design System](020-light-orange-visual-design.md)
