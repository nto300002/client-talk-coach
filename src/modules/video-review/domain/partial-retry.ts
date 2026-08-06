export type PartialRetryStatus = "active" | "completed";
export type PartialRetryRecord = {
  id: string;
  originalSessionId: string;
  category: string;
  durationSeconds: number;
  task: string;
  createdAt: string;
  completedAt: string | null;
  status: PartialRetryStatus;
  responseText: string;
  responseCharacterCount: number;
};

export class PartialRetryNotFinishedError extends Error {
  readonly code = "PARTIAL_RETRY_NOT_FINISHED";

  constructor() {
    super("The partial retry cannot be completed before its duration ends.");
  }
}

export function startPartialRetry(input: Omit<PartialRetryRecord, "id" | "createdAt" | "completedAt" | "status" | "responseText" | "responseCharacterCount"> & { id: string; createdAt: string }): PartialRetryRecord {
  return { ...input, completedAt: null, status: "active", responseText: "", responseCharacterCount: 0 };
}

export function remainingPartialRetrySeconds(retry: PartialRetryRecord, now: Date): number {
  const startedAtMs = new Date(retry.createdAt).getTime();
  const elapsedSeconds = Math.floor((now.getTime() - startedAtMs) / 1_000);
  return Math.max(0, retry.durationSeconds - elapsedSeconds);
}

export function canCompletePartialRetry(retry: PartialRetryRecord, now: Date): boolean {
  return retry.status === "completed" || remainingPartialRetrySeconds(retry, now) === 0;
}

export function completePartialRetry(retry: PartialRetryRecord, completedAt: string, responseText = ""): PartialRetryRecord {
  if (!canCompletePartialRetry(retry, new Date(completedAt))) {
    throw new PartialRetryNotFinishedError();
  }
  return retry.status === "completed" ? retry : { ...retry, status: "completed", completedAt, responseText, responseCharacterCount: responseText.replace(/[\s、。！？]/g, "").length };
}
