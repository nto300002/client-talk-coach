import { describe, expect, it } from "vitest";

import {
  beginPracticeSession,
  pausePracticeSession,
  resumePracticeSession,
} from "@/modules/practice-session/application/practice-lifecycle";

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

describe("practice lifecycle", () => {
  it("starts an active session only after the device-check lifecycle transitions", () => {
    const session = beginPracticeSession("session-001", configuration);

    expect(session).toMatchObject({ id: "session-001", status: "active", canProcessUserTurn: true });
  });

  it("delegates pause and resume to the session state machine", () => {
    const session = beginPracticeSession("session-001", configuration);

    expect(pausePracticeSession(session).status).toBe("paused");
    expect(resumePracticeSession(pausePracticeSession(session)).status).toBe("active");
  });
});
