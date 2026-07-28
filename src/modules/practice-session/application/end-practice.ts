import {
  transitionPracticeSession,
  type PracticeEndReason,
  type PracticeSession,
} from "@/modules/practice-session/domain/practice-session";

export type EndPracticeDependencies = {
  stopRecording: (sessionId: string) => Promise<void>;
  freezeScenario: (sessionId: string) => Promise<void>;
  saveSession: (session: PracticeSession) => Promise<void>;
};

export type EndPracticeInput = {
  session: PracticeSession;
  reason: Exclude<PracticeEndReason, "emergency_end"> | "emergency_end";
};

export type EndPracticeOutput = PracticeSession & {
  recordingStopFailed: boolean;
};

export class EndPractice {
  constructor(private readonly dependencies: EndPracticeDependencies) {}

  async execute(input: EndPracticeInput): Promise<EndPracticeOutput> {
    if (input.session.status === "post_review") {
      return { ...input.session, recordingStopFailed: false };
    }

    let recordingStopFailed = false;

    try {
      await this.dependencies.stopRecording(input.session.id);
    } catch {
      recordingStopFailed = true;
    }

    await this.dependencies.freezeScenario(input.session.id);

    const session = transitionPracticeSession(
      input.session,
      input.reason === "emergency_end"
        ? { type: "EMERGENCY_END_REQUESTED" }
        : { type: "END_REQUESTED", reason: input.reason },
    );
    const safeSession = recordingStopFailed
      ? { ...session, preserveRecoverableData: true }
      : session;

    await this.dependencies.saveSession(safeSession);

    return { ...safeSession, recordingStopFailed };
  }
}
