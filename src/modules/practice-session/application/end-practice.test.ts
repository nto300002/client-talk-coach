import { describe, expect, it, vi } from "vitest";

import { EndPractice } from "@/modules/practice-session/application/end-practice";
import {
  createPracticeSession,
  transitionPracticeSession,
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

describe("EndPractice", () => {
  it("stops recording, freezes scenario state, persists the session, and opens post review", async () => {
    const stopRecording = vi.fn().mockResolvedValue(undefined);
    const freezeScenario = vi.fn().mockResolvedValue(undefined);
    const saveSession = vi.fn().mockResolvedValue(undefined);
    const session = activeSession();

    const result = await new EndPractice({ stopRecording, freezeScenario, saveSession }).execute({
      session,
      reason: "user_completed",
    });

    expect(stopRecording).toHaveBeenCalledWith(session.id);
    expect(freezeScenario).toHaveBeenCalledWith(session.id);
    expect(saveSession).toHaveBeenCalledWith(expect.objectContaining({ status: "post_review" }));
    expect(result.status).toBe("post_review");
  });

  it("still persists a safe post-review session when recording stop fails", async () => {
    const freezeScenario = vi.fn().mockResolvedValue(undefined);
    const saveSession = vi.fn().mockResolvedValue(undefined);
    const session = activeSession();

    const result = await new EndPractice({
      stopRecording: vi.fn().mockRejectedValue(new Error("recorder unavailable")),
      freezeScenario,
      saveSession,
    }).execute({ session, reason: "emergency_end" });

    expect(freezeScenario).toHaveBeenCalledWith(session.id);
    expect(saveSession).toHaveBeenCalledWith(
      expect.objectContaining({ status: "post_review", preserveRecoverableData: true }),
    );
    expect(result.recordingStopFailed).toBe(true);
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
