import { describe, expect, it } from "vitest";

import {
  createPracticeSession,
  transitionPracticeSession,
  PracticeSessionTransitionError,
} from "@/modules/practice-session/domain/practice-session";

const configuration = {
  scenarioId: "initial-requirements-interview",
  scenarioVersion: 1,
  sceneId: "welfare-office-first-call",
  sceneVersion: 1,
  difficultyLevel: 2 as const,
  clientTypeId: "low-it-knowledge-client",
  focusSkillId: "ask-questions" as const,
  focusSkillSource: "user" as const,
  durationMinutes: 7 as const,
  tensionBefore: 4,
  confidenceBefore: 6,
};

describe("practice session state machine", () => {
  it("moves from setup through device check and active practice", () => {
    const setup = createPracticeSession("session-001", configuration);
    const deviceCheck = transitionPracticeSession(setup, { type: "DEVICE_CHECK_STARTED" });
    const ready = transitionPracticeSession(deviceCheck, { type: "DEVICE_CHECK_PASSED" });
    const active = transitionPracticeSession(ready, { type: "PRACTICE_STARTED" });

    expect(active.status).toBe("active");
  });

  it("rejects invalid transitions with a typed application error", () => {
    const setup = createPracticeSession("session-001", configuration);

    expect(() => transitionPracticeSession(setup, { type: "PRACTICE_STARTED" })).toThrow(
      PracticeSessionTransitionError,
    );
  });

  it("pauses only active practice, blocks user turn processing, and resumes the same session", () => {
    const active = activeSession();
    const paused = transitionPracticeSession(active, { type: "PAUSE_REQUESTED" });

    expect(paused.status).toBe("paused");
    expect(paused.canProcessUserTurn).toBe(false);
    expect(() => transitionPracticeSession(paused, { type: "USER_TURN_RECEIVED" })).toThrow(
      PracticeSessionTransitionError,
    );

    const resumed = transitionPracticeSession(paused, { type: "RESUME_REQUESTED" });
    expect(resumed).toMatchObject({ id: active.id, status: "active", canProcessUserTurn: true });
  });

  it("handles end idempotently and keeps one final post-review state", () => {
    const active = activeSession();
    const ended = transitionPracticeSession(active, { type: "END_REQUESTED", reason: "user_completed" });
    const endedAgain = transitionPracticeSession(ended, { type: "END_REQUESTED", reason: "user_completed" });

    expect(ended).toMatchObject({ status: "post_review", endReason: "user_completed" });
    expect(endedAgain).toEqual(ended);
  });

  it("keeps emergency-end data recoverable and moves to post review", () => {
    const active = activeSession();
    const ended = transitionPracticeSession(active, { type: "EMERGENCY_END_REQUESTED" });

    expect(ended).toMatchObject({
      status: "post_review",
      endReason: "emergency_end",
      preserveRecoverableData: true,
    });
  });

  it("rejects pausing outside active practice", () => {
    const setup = createPracticeSession("session-001", configuration);

    expect(() => transitionPracticeSession(setup, { type: "PAUSE_REQUESTED" })).toThrow(
      PracticeSessionTransitionError,
    );
  });
});

function activeSession() {
  return transitionPracticeSession(
    transitionPracticeSession(
      transitionPracticeSession(createPracticeSession("session-001", configuration), {
        type: "DEVICE_CHECK_STARTED",
      }),
      { type: "DEVICE_CHECK_PASSED" },
    ),
    { type: "PRACTICE_STARTED" },
  );
}
