# TDD Behavior And Test Design

## 1. TDD Policy

The MVP is implemented with test-driven development. Each feature starts with natural-language behavior and acceptance tests, then automated tests, then the smallest implementation that passes.

The implementation cycle is:

1. Define expected behavior in natural language.
2. Define acceptance requirements.
3. Write natural-language test cases.
4. Convert them into automated tests.
5. Implement the minimum code.
6. Refactor while keeping tests green.

Test layers:

- Unit tests: pure functions, state transitions, schemas, prioritization, validators.
- Component tests: React components, forms, buttons, error messages, disabled states.
- Integration tests: IndexedDB, recording facade, STT facade, AI facade, scenario engine.
- E2E tests: full practice flow from setup to history.
- AI fixture tests: fixed transcripts and expected structured evaluations.

## 2. Scenario Selection

### Behavior

The user selects one business situation from the supported outsourced-development scenarios. The selection controls available scenes, difficulty levels, client types, and evaluation rubric.

### Natural-Language Tests

- When the scenario selection page opens, the 11 supported situations are displayed.
- When the user selects one situation, only that situation is selected.
- When the user selects another situation, the previous selection is cleared.
- When no situation is selected, the next button is disabled.
- When a situation is disabled in scenario data, the user cannot select it.
- When a new valid situation is added to scenario data, it appears without changing the selection component.

## 3. Concrete Scene Selection

### Behavior

After choosing a situation, the user selects a concrete scene that belongs to that situation.

### Natural-Language Tests

- The scene list contains only scenes belonging to the selected situation.
- Changing the parent situation clears any previously selected scene.
- A scene shows its summary and practice goal.
- A scene that does not support the selected difficulty or client type cannot be started.
- A nonexistent parent situation returns no selectable scenes.

## 4. Difficulty Selection

### Behavior

The user chooses difficulty level 1 to 5. Higher levels increase hidden facts, ambiguity, contradictions, pressure, unexpected questions, and time pressure.

### Natural-Language Tests

- The default recommended difficulty is shown when history exists.
- If no history exists, the app recommends level 1 or level 2.
- The user can choose a difficulty different from the recommendation.
- A scenario can restrict which difficulty levels are available.
- A disallowed difficulty cannot be selected.
- Level 5 has equal or greater hidden fact, pressure, ambiguity, and unexpected-question settings than level 1.
- Selecting difficulty updates the practice configuration.

## 5. Client Type Selection

### Behavior

The user chooses an AI client type. The type changes the client's tone, IT knowledge, verbosity, cooperation, and resistance.

### Natural-Language Tests

- Only compatible client types are shown for the selected scene.
- Selecting a client type updates AI client configuration.
- Incompatible combinations are disabled in normal mode.
- Admin experiment mode can allow incompatible combinations for testing.
- Changing client type does not clear the selected situation or scene.

## 6. Focus Skill Selection

### Behavior

The user selects exactly one focus skill. The selected skill influences feedback priority unless a more serious issue occurs.

### Natural-Language Tests

- Only one focus skill can be selected.
- Selecting "let the app choose" picks a focus skill from history or scenario defaults.
- If no serious issue occurs, the selected focus skill is prioritized in feedback.
- If a critical requirement is missed, that issue overrides the selected focus skill.
- The generated feedback still contains exactly one primary improvement.

## 7. Practice Duration

### Behavior

The user chooses 5, 7, or 10 minutes. The default is 7 minutes.

### Natural-Language Tests

- New practice setup defaults to 7 minutes.
- The user can select 5, 7, or 10 minutes.
- Values other than 5, 7, or 10 are rejected.
- The app warns the user when 1 minute remains.
- When time expires, the conversation ends once.
- Recording duration does not greatly exceed the selected duration.

## 8. Pre-Practice Self-Review

### Behavior

Before practice, the user records tension and confidence from 0 to 10.

### Natural-Language Tests

- Tension accepts 0 and 10.
- Confidence accepts 0 and 10.
- Negative numbers are rejected.
- Values greater than 10 are rejected.
- Text, empty values, and decimal values are rejected.
- Practice cannot start until both values are present.
- Saved values are linked to the current practice session.

## 9. Camera And Microphone Check

### Behavior

Before practice starts, the app checks camera permission, microphone permission, video preview, microphone level, and local storage readiness.

### Natural-Language Tests

- If camera and microphone are granted, a preview appears.
- If the microphone level is too low, the app shows a warning.
- If camera permission is denied, recording practice cannot start.
- If microphone permission is denied, AI voice conversation cannot start.
- If no microphone is detected, the start button is disabled.
- If local storage is insufficient, the app blocks practice start and explains why.
- When the stream is stopped, all media tracks are stopped.

## 10. Recording

### Behavior

Practice start begins recording the user's camera and microphone. Recording is split into chunks and stored in IndexedDB.

### Natural-Language Tests

- Recording starts when the practice conversation starts.
- Recording state is visible on screen.
- Starting recording twice does not create duplicate recorders.
- Pause and resume update the recording state correctly.
- Stopping recording produces playable WebM data when supported.
- Chunks are saved in sequence order.
- Missing chunks are detected.
- If saving a chunk fails, the app retries or marks the recording as recoverable.
- If the browser closes unexpectedly, already saved chunks appear as a recovery candidate.

## 11. AI Client Conversation

### Behavior

The user's speech is transcribed. The app sends scenario state and recent conversation context to the AI client model. The AI client responds in text, then the browser reads it aloud.

### Natural-Language Tests

- A user utterance is converted into transcript text.
- The AI client response is normally 1 to 3 sentences.
- The AI client asks no more than one question at a time.
- The AI client does not reveal hidden facts before their disclosure condition is met.
- When the user asks the right question, the corresponding fact becomes eligible for disclosure.
- The AI client does not create important scenario facts that do not exist.
- If AI response generation fails, the user can retry.
- If text-to-speech fails, the user can still see the text response.
- The same response is not read aloud twice.

## 12. Scenario State Management

### Behavior

The app tracks hidden facts, disclosed facts, confirmed requirements, unresolved items, contradictions, and agreements.

### Natural-Language Tests

- Hidden facts start in the hidden state.
- Direct-question facts are disclosed only after a matching question.
- Deep-question facts are disclosed only after a follow-up question.
- A disclosed fact can become confirmed.
- A confirmed fact never returns to hidden.
- Processing the same event twice does not duplicate requirement capture.
- Ending the session freezes the captured requirement result.
- Re-evaluating the same frozen state returns the same captured and missing facts.

## 13. Pause And Emergency End

### Behavior

The user can pause or safely end practice when tension becomes too high.

### Natural-Language Tests

- During pause, the AI client does not speak.
- During pause, recording state is clearly shown.
- Resuming continues the same session.
- Emergency end stops recording and stores available data.
- Emergency end does not display the result as a failure.
- Multiple clicks on end produce only one end event.
- After emergency end, the user can still enter post-practice self-review.

## 14. Post-Practice Self-Review

### Behavior

After the conversation, the user records tension, confidence, and subjective reflections before AI feedback is shown.

### Natural-Language Tests

- The self-review screen appears before AI feedback.
- Tension and confidence accept only integers from 0 to 10.
- The app calculates the difference between pre- and post-practice tension.
- The app calculates the difference between pre- and post-practice confidence.
- Free text is saved when within the maximum length.
- The result page cannot be opened until self-review is saved.

## 15. Audio Analysis

### Behavior

The app analyzes volume, silence, response delay, speaking speed, fillers, and overlap with AI speech.

### Natural-Language Tests

- Silent intervals are not treated as speech.
- Intervals below the user's calibrated volume baseline are marked as low volume.
- Long silence is detected when it exceeds the configured threshold.
- Time before the user's first response is measured.
- Speaking speed is calculated from Japanese transcript length and speech duration.
- Fillers from the dictionary are detected.
- Words that merely contain filler characters are not always counted as fillers.
- Overlap is calculated from AI speech intervals and user speech intervals.
- Every marker has a timestamp.

## 16. Conversation Analysis

### Behavior

The app analyzes question categories, answer structure, directness, technical explanation, topic scattering, and agreements.

### Natural-Language Tests

- "When do you need this?" is classified as schedule confirmation.
- "Who will use this?" is classified as user confirmation.
- A response that starts with the answer is classified as conclusion-first.
- A response with a long preface before the answer is marked as an improvement candidate.
- A technical term used without explanation is marked as an improvement candidate.
- A correctly explained technical term is not marked as unexplained.
- Agreements, responsible parties, and deadlines are extracted when present.
- If no agreement exists, the agreement list is empty.
- An evaluation without evidence utterances is rejected.

## 17. Scenario-Specific Evaluation

### Behavior

The app evaluates captured and missing items using the selected scenario's fact IDs and rubric.

### Natural-Language Tests

- Initial requirements interview evaluates purpose, current workflow, users, user count, deadline, budget, personal information, permissions, and data migration.
- Scope-change handling evaluates purpose, impact, cost, delivery date, alternative plan, and response deadline.
- Delay explanation evaluates delayed item, reason, impact, countermeasure, new deadline, and next report date.
- Missing critical items are displayed before normal missing items.
- A nonexistent fact ID is rejected or ignored according to schema rules.
- The same finalized scenario state always returns the same evaluation.
- LLM impression alone cannot mark a requirement as captured.

## 18. Feedback Generation

### Behavior

The app combines analysis results and shows strengths plus exactly one primary improvement.

### Natural-Language Tests

- Strengths appear before the improvement.
- Only one primary improvement is displayed.
- Critical misunderstanding outranks all other feedback.
- Missing critical requirement outranks voice volume.
- If multiple issues have equal priority, the selected focus skill breaks the tie.
- The feedback never says "you are anxious" or similar emotion diagnosis.
- The feedback never evaluates personality.
- The improvement includes a concrete retry exercise.
- If no strong issue exists, the app chooses a gentle next practice item.

## 19. Video Review

### Behavior

The user can replay the local recording and jump to timestamped markers.

### Natural-Language Tests

- A saved recording can be played.
- Markers are sorted by time.
- Selecting a marker seeks the video to the marker time.
- Good moments and improvement candidates are visually distinct.
- If the video has been deleted, analysis still remains visible.
- The user can choose to review text and audio metrics without watching the video.
- Blob URLs are released after deletion or unmount.

## 20. Partial Retry

### Behavior

The app creates a short retry task from the primary improvement and stores it separately from the original practice.

### Natural-Language Tests

- A retry task is generated from the selected primary improvement.
- The retry task is linked to the original session ID.
- The retry task has a maximum duration between 30 seconds and 2 minutes.
- Retry results are saved separately from full practice sessions.
- The user can retry the same task multiple times.
- Retry count increases after each completed retry.
- The app can compare the original attempt and retry attempt for the target metric.

## 21. History And Previous Comparison

### Behavior

The app stores local practice history and compares a session with the previous matching session.

### Natural-Language Tests

- History is sorted from newest to oldest.
- Each entry shows date, situation, difficulty, client type, duration, and recording availability.
- The previous comparison uses the latest session with the same situation, scene, difficulty, and client type.
- If no previous matching session exists, the page says this is the first attempt for that condition.
- Deleted videos are shown as deleted while analysis remains accessible.
- Partial retries are visually distinct from full practice sessions.
- Deleting a session deletes related chunks, self-review, analysis, and retry links.

## 22. Local Storage And Auto Delete

### Behavior

The app stores recordings, session metadata, self-review, analysis, and history in IndexedDB. Recordings expire after 30 days unless favorited.

### Natural-Language Tests

- Every saved object is linked to a session ID.
- Recording chunks and analysis can be retrieved by session ID.
- Recordings older than 30 days are eligible for deletion.
- Recordings exactly on the boundary date follow the documented boundary rule.
- Favorite recordings are not deleted automatically.
- Running "delete all data" removes sessions, chunks, self-review, analysis, and local settings.
- Before deletion, the app explains that deleted data cannot be restored.
- If deletion fails midway, the app remains in a consistent state.

## 23. Admin Experiment Mode

### Behavior

The developer can create, edit, duplicate, validate, and compare scenario and prompt definitions.

### Natural-Language Tests

- A valid scenario definition can be saved.
- A scenario missing required fields is rejected.
- A scenario referencing nonexistent fact IDs is rejected.
- A difficulty range with invalid ordering is rejected.
- Updating a scenario creates a new version or preserves the old version.
- The same conversation can be evaluated with multiple prompt versions.
- Experiment mode uses developer-created test data only.
- Normal practice data is not automatically used for experiments.

## 24. Error Handling

### Behavior

The app handles device, recording, storage, STT, AI, TTS, network, and evaluation errors without exposing private content or losing recoverable data.

### Natural-Language Tests

- Camera permission denial shows a clear user-facing message.
- Microphone permission denial shows a clear user-facing message.
- Recording start failure blocks practice and explains the issue.
- IndexedDB save failure retries or marks the data as recoverable.
- STT failure can be retried.
- AI response failure can be retried.
- TTS failure shows text response as fallback.
- After retry limit is exceeded, the app can safely end the session.
- Error messages do not contain transcript text, video data, self-review content, or raw stack traces.
- Unknown errors use a generic safe message.

## 25. E2E Acceptance Scenario

### Behavior

The core MVP path works from setup to history.

### Natural-Language Tests

1. The user selects a situation.
2. The user selects a concrete scene.
3. The user selects difficulty.
4. The user selects client type.
5. The user selects a focus skill.
6. The user selects duration.
7. The user enters pre-practice tension and confidence.
8. The user completes camera and microphone check.
9. The user starts practice.
10. Recording begins.
11. The user speaks with the AI client.
12. The user ends the conversation.
13. Recording is saved locally.
14. The user enters post-practice self-review.
15. Audio analysis is displayed.
16. Conversation analysis is displayed.
17. Scenario-specific captured and missing items are displayed.
18. Strengths are displayed before improvement.
19. Exactly one primary improvement is displayed.
20. The user starts a partial retry.
21. Retry result is linked to the original session.
22. The session appears in history.
23. The next matching session can compare against this session.

## 26. Implementation Order For TDD

1. Scenario definition schema
2. Scenario, scene, difficulty, client type, focus skill, and duration selection
3. Practice state machine
4. Pre- and post-practice self-review
5. Camera and microphone check facade
6. Recording facade and IndexedDB persistence
7. Audio analysis pure functions
8. STT service interface and mock implementation
9. AI client service interface and mock implementation
10. Scenario state management
11. Scenario-specific evaluation
12. Conversation analysis schema and fixture tests
13. Feedback prioritization and generation
14. Video review markers
15. Partial retry
16. History and previous comparison
17. Admin experiment mode
18. E2E path with mocked media and AI services

