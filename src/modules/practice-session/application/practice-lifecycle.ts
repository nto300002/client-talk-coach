import type { PracticeSetupConfiguration } from "@/modules/practice-setup/domain/practice-setup";
import {
  createPracticeSession,
  transitionPracticeSession,
  type PracticeEndReason,
  type PracticeSession,
} from "@/modules/practice-session/domain/practice-session";
import { EndPractice } from "@/modules/practice-session/application/end-practice";

export function beginPracticeSession(
  sessionId: string,
  configuration: PracticeSetupConfiguration,
): PracticeSession {
  const session = createPracticeSession(sessionId, configuration);
  const checkingDevice = transitionPracticeSession(session, { type: "DEVICE_CHECK_STARTED" });
  const ready = transitionPracticeSession(checkingDevice, { type: "DEVICE_CHECK_PASSED" });
  return transitionPracticeSession(ready, { type: "PRACTICE_STARTED" });
}

export function pausePracticeSession(session: PracticeSession): PracticeSession {
  return transitionPracticeSession(session, { type: "PAUSE_REQUESTED" });
}

export function resumePracticeSession(session: PracticeSession): PracticeSession {
  return transitionPracticeSession(session, { type: "RESUME_REQUESTED" });
}

export async function endPracticeWithoutMedia(
  session: PracticeSession,
  reason: Exclude<PracticeEndReason, "emergency_end"> | "emergency_end",
): Promise<PracticeSession> {
  const result = await new EndPractice({
    stopRecording: async () => undefined,
    freezeScenario: async () => undefined,
    saveSession: async () => undefined,
  }).execute({ session, reason });

  return result;
}
