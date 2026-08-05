import { ApplicationError } from "@/domain/errors/application-error";
import type { PracticeSetupConfiguration } from "@/modules/practice-setup/domain/practice-setup";

export type PracticeStatus =
  | "setup"
  | "device_check"
  | "ready"
  | "active"
  | "paused"
  | "ending"
  | "post_review"
  | "analyzing"
  | "reviewable"
  | "completed"
  | "recoverable";

export type PracticeEndReason =
  | "user_completed"
  | "time_expired"
  | "emergency_end"
  | "provider_failure"
  | "browser_interruption";

export type PracticeSession = {
  id: string;
  configuration: PracticeSetupConfiguration;
  status: PracticeStatus;
  canProcessUserTurn: boolean;
  endReason: PracticeEndReason | null;
  preserveRecoverableData: boolean;
};

export type PracticeSessionEvent =
  | { type: "DEVICE_CHECK_STARTED" }
  | { type: "DEVICE_CHECK_PASSED" }
  | { type: "PRACTICE_STARTED" }
  | { type: "PAUSE_REQUESTED" }
  | { type: "RESUME_REQUESTED" }
  | { type: "USER_TURN_RECEIVED" }
  | { type: "END_REQUESTED"; reason: Exclude<PracticeEndReason, "emergency_end"> }
  | { type: "EMERGENCY_END_REQUESTED" };

export function createPracticeSession(
  id: string,
  configuration: PracticeSetupConfiguration,
): PracticeSession {
  return {
    id,
    configuration,
    status: "setup",
    canProcessUserTurn: false,
    endReason: null,
    preserveRecoverableData: false,
  };
}

export function transitionPracticeSession(
  session: PracticeSession,
  event: PracticeSessionEvent,
): PracticeSession {
  if (event.type === "END_REQUESTED" && session.status === "post_review") {
    return session;
  }

  switch (event.type) {
    case "DEVICE_CHECK_STARTED":
      return transition(session, ["setup"], { status: "device_check" }, event.type);
    case "DEVICE_CHECK_PASSED":
      return transition(session, ["device_check"], { status: "ready" }, event.type);
    case "PRACTICE_STARTED":
      return transition(
        session,
        ["ready"],
        { status: "active", canProcessUserTurn: true },
        event.type,
      );
    case "PAUSE_REQUESTED":
      return transition(
        session,
        ["active"],
        { status: "paused", canProcessUserTurn: false },
        event.type,
      );
    case "RESUME_REQUESTED":
      return transition(
        session,
        ["paused"],
        { status: "active", canProcessUserTurn: true },
        event.type,
      );
    case "USER_TURN_RECEIVED":
      if (session.status === "active" && session.canProcessUserTurn) {
        return session;
      }
      throw invalidTransition(session, event.type);
    case "END_REQUESTED":
      return endSession(session, event.reason, false, event.type);
    case "EMERGENCY_END_REQUESTED":
      if (session.status === "post_review") {
        return session;
      }
      return endSession(session, "emergency_end", true, event.type);
  }
}

export class PracticeSessionTransitionError extends ApplicationError {
  constructor(message: string) {
    super("PRACTICE_INVALID_TRANSITION", message);
    this.name = "PracticeSessionTransitionError";
  }
}

function transition(
  session: PracticeSession,
  expectedStatuses: PracticeStatus[],
  changes: Partial<PracticeSession>,
  eventType: PracticeSessionEvent["type"],
): PracticeSession {
  if (!expectedStatuses.includes(session.status)) {
    throw invalidTransition(session, eventType);
  }

  return { ...session, ...changes };
}

function endSession(
  session: PracticeSession,
  reason: PracticeEndReason,
  preserveRecoverableData: boolean,
  eventType: PracticeSessionEvent["type"],
): PracticeSession {
  if (!["active", "paused", "ready"].includes(session.status)) {
    throw invalidTransition(session, eventType);
  }

  return {
    ...session,
    status: "post_review",
    canProcessUserTurn: false,
    endReason: reason,
    preserveRecoverableData,
  };
}

function invalidTransition(session: PracticeSession, eventType: string) {
  return new PracticeSessionTransitionError(
    `Cannot apply ${eventType} while practice session is ${session.status}.`,
  );
}
