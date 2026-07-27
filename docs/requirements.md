# Client Talk Coach Requirements

## 1. Product Summary

Client Talk Coach is a personal web app for practicing client communication in outsourced software development. The first MVP is for the developer's own use, not for public release, corporate training, employee evaluation, or medical treatment.

The app helps the user practice conversations with an audio-only AI client, record their own camera and microphone, review the result privately, and repeat difficult moments in short sessions.

## 2. Primary Goals

- Build confidence in client-facing software development conversations.
- Reduce tension through repeated, private practice.
- Practice speaking clearly enough for the other party to hear.
- Learn to answer with the conclusion first.
- Organize scattered thoughts into clear responses.
- Ask questions that reveal requirements, constraints, risks, and decisions.
- Explain technical topics in language that non-engineers can understand.
- Confirm scope, schedule, budget, responsibilities, and next actions.

## 3. Non-Goals

- The app does not diagnose anxiety, personality, disability, or mental state.
- The app does not infer emotional state from facial expressions.
- The app does not rank users or compare them with other users.
- The app does not provide an employer-facing evaluation dashboard.
- The MVP does not analyze real Zoom meetings.
- The MVP does not store videos in the cloud.
- The MVP does not include billing, public signup, or corporate user management.

## 4. MVP User Scope

The Phase 0 MVP is for one personal user: the developer.

General public release, multi-user authentication, billing, and organization features are future phases. The MVP should still avoid architectural choices that make future public release difficult.

## 5. Platform

- Web app only.
- PC-first experience.
- Chrome latest is the priority browser.
- AI client is audio-only.
- The user records their own camera and microphone.
- Video is stored locally on the user's device.

## 6. Practice Flow

1. Select a business situation.
2. Select a concrete scene.
3. Select difficulty.
4. Select client type.
5. Select one focus skill.
6. Select practice duration.
7. Enter pre-practice tension and confidence.
8. Check camera, microphone, and storage readiness.
9. Start recording and talk with the AI client.
10. End the conversation or let the time limit end it.
11. Enter post-practice self-review before seeing AI feedback.
12. Review audio, conversation, and scenario-specific analysis.
13. See strengths and exactly one primary improvement.
14. Retry a short difficult moment for 30 seconds to 2 minutes.
15. Save the result to local history and compare with previous attempts.

## 7. Selectable Business Situations

The MVP should support the following 11 categories.

1. Initial requirements interview
2. Clarifying vague requests
3. Proposal and estimate explanation
4. Specification confirmation and alignment
5. Scope change and additional requests
6. Progress reporting
7. Schedule delay explanation
8. Incident and bug handling
9. Complaint handling
10. Delivery, acceptance, and maintenance
11. Meeting facilitation

Each situation can have multiple concrete scenes. New scenes should be added mainly through scenario definition data, not by changing UI logic.

## 8. Difficulty Levels

Every scenario should support selectable difficulty where appropriate.

### Level 1: Practice

- Client is cooperative.
- Client answers clearly.
- Client does not pressure the user.
- Client waits during silence.
- Important information is relatively easy to obtain.

### Level 2: Beginner

- Some information is hidden until asked.
- Requirements are mildly vague.
- The client asks simple follow-up questions.

### Level 3: Standard

- Requirements are vague.
- Multiple topics may be mixed.
- Some misunderstandings occur.
- Important information is not volunteered.

### Level 4: Difficult

- Client statements may contain contradictions.
- The client may pressure the user about scope, cost, or delivery date.
- The client may ask for immediate answers.
- Multiple issues may appear in the same conversation.

### Level 5: Realistic

- Little prior information is shown.
- Unexpected questions occur.
- Multiple hidden facts exist.
- Client opinions may change during the conversation.
- A time limit applies.
- The meeting should end with clear agreements and next actions.

Difficulty is always user-selectable. The app may recommend a difficulty based on previous results, but it must not force progression.

## 9. Client Types

The user can select an AI client type, subject to compatibility with the selected scene.

- Cooperative client
- Low IT-literacy client
- High IT-literacy client
- Vague client
- Quiet client
- Long-winded client
- Decision-rushed client
- Schedule-focused client
- Budget-focused client
- Frequently changing client
- Argumentative client
- Emotionally reactive client

Incompatible combinations should be disabled in normal mode. Admin experiment mode may allow them for testing.

## 10. Focus Skill

The user selects exactly one focus skill for each practice.

- Voice volume
- Speaking slowly
- Conclusion-first response
- Short answers
- Asking questions
- Organizing topics
- Summarizing the client's statement
- Confirming shared understanding
- Rephrasing technical terms
- Saying "I do not know" and committing to check
- Avoiding instant answers
- Declining requests
- Explaining additional cost
- Separating apology and countermeasure
- Summarizing the meeting
- Deciding next actions

If the user selects "let the app choose", the app chooses one focus skill from the scenario default or past history.

## 11. Practice Duration And Cost Assumption

- One practice session is 5, 7, or 10 minutes.
- Default duration is 7 minutes.
- Phase 0 usage assumes 20 to 50 sessions per month.
- Monthly total practice time is 100 to 500 minutes.
- AI client responses should normally be 1 to 3 sentences.
- The AI client should ask only one question at a time.
- Conversation evaluation runs once after the session, not after every turn.

## 12. Local Recording And Storage

- Camera and microphone are captured with browser APIs.
- Recording format is WebM where supported.
- Recording data is stored in IndexedDB, split into small chunks.
- Default retention is 30 days.
- The personal MVP stores at most 20 completed recordings on the device.
- Recovery candidates are managed separately and do not count toward the 20-recording limit.
- If a new recording would exceed the 20-recording limit, the app deletes the oldest non-favorite recording after the new recording is successfully saved.
- If saving the new recording fails, existing recordings are not deleted.
- Auto deletion removes the video metadata and recording chunks, but keeps practice history, self-review, audio analysis, conversation analysis, scenario evaluation, and feedback.
- History for an auto-deleted recording shows that the recording was removed because of the storage limit.
- If all 20 recordings are favorites, the app blocks starting a new recording and asks the user to unfavorite or delete a recording.
- Favorite recordings are excluded from both retention-based auto deletion and recording-limit auto deletion.
- Manual video deletion removes the video and chunks but keeps the practice history and analysis.
- The user can play, delete, download, and bulk-delete recordings.
- Cloud video storage is out of scope for the MVP.

Audio or text required for STT and AI conversation may be sent to external APIs. "Private" means that other users and administrators cannot view the user's recordings, transcripts, self-review, or evaluation results. It does not mean that no data is ever sent to external AI providers.

### Recording Metadata

```typescript
type RecordingMetadata = {
  id: string;
  sessionId: string;
  createdAt: string;
  deletedAt: string | null;
  deletionReason:
    | "manual"
    | "retention_expired"
    | "recording_limit"
    | null;
  isFavorite: boolean;
  status: "recording" | "completed" | "recoverable" | "deleted";
};
```

## 13. AI And API Cost Strategy

The MVP uses a low-cost separated pipeline instead of an all-in-one realtime voice model.

```text
User speech
-> Speech-to-text
-> Low-cost LLM for AI client response
-> Browser SpeechSynthesis for AI voice
```

Recommended Phase 0 choices:

- Speech-to-text: Google Cloud Speech-to-Text V2
- AI client response: Gemini Flash-Lite class model
- Text-to-speech: browser SpeechSynthesis
- Audio metrics: local Web Audio API
- Video storage: local IndexedDB

Silence should not be sent to STT when avoidable. The app should use voice activity detection or equivalent segmentation to reduce cost.

## 14. Analysis Requirements

### Audio Analysis

- Average volume
- Low-volume intervals
- Long silence
- Time before first response
- Speaking speed
- Fillers
- Overlap with AI client speech
- Timestamped markers

### Conversation Analysis

- Question category
- Conclusion-first response
- Long preface
- Direct answer to client question
- Unexplained technical terms
- Topic scattering
- Agreement extraction
- Person-in-charge and deadline extraction

### Scenario-Specific Analysis

- Captured facts
- Missing critical facts
- Confirmed contradictions
- Explained constraints
- Agreements
- Follow-up items

Requirement capture should be based on scenario fact IDs and state transitions, not only on LLM impression.

## 15. Feedback Requirements

The result screen shows feedback in this order:

1. What the user did well
2. Good utterances
3. Captured and confirmed items
4. Improvements compared with the previous attempt
5. Exactly one primary improvement
6. A short retry exercise

The app must not show:

- Overall communication score
- User ranking
- AI-inferred confidence percentage
- Anxiety or personality diagnosis
- Emotion labels inferred from face or voice

Primary improvement priority:

1. Critical misunderstanding
2. Missing critical requirement
3. Failure to answer the client's question
4. Missing agreement or next action
5. Unclear structure
6. Low volume or speech metric issue
7. Non-verbal observation, if implemented later

## 16. Partial Retry

The app generates a short retry exercise based on the primary improvement. The retry should last 30 seconds to 2 minutes and be linked to the original practice session.

Examples:

- First greeting
- First question
- Saying "I will check and get back to you"
- Explaining a scope change
- Explaining additional cost
- Reporting delay
- Apology plus countermeasure
- Meeting summary
- Next action confirmation

## 17. Admin Experiment Mode

The personal MVP includes an admin experiment mode for the developer to edit and test scenario behavior.

Admin experiment mode can edit:

- Situation and concrete scene
- Client profile
- Client type
- Difficulty parameters
- Initial facts
- Hidden facts
- Contradictions
- Expected questions
- Evaluation rubric
- AI client prompt
- Evaluation prompt
- Model settings
- Response length

Experiment mode uses developer-owned test data only.

## 18. MVP Completion Criteria

The MVP is complete when the following flow works reliably:

1. Select situation, scene, difficulty, client type, focus skill, and duration.
2. Enter pre-practice tension and confidence.
3. Pass camera and microphone check.
4. Talk with the AI client for 5 to 10 minutes.
5. Record the user's video and audio locally.
6. Enter post-practice self-review before AI feedback.
7. Display audio analysis, conversation analysis, and scenario-specific evaluation.
8. Show strengths and exactly one primary improvement.
9. Start and save a linked partial retry.
10. Save history locally and compare with the previous matching session.
11. Add new scenario definitions without changing common engine code.
