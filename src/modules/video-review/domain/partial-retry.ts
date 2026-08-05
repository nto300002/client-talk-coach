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
};

export function startPartialRetry(input: Omit<PartialRetryRecord, "id" | "createdAt" | "completedAt" | "status"> & { id: string; createdAt: string }): PartialRetryRecord {
  return { ...input, completedAt: null, status: "active" };
}

export function completePartialRetry(retry: PartialRetryRecord, completedAt: string): PartialRetryRecord {
  return retry.status === "completed" ? retry : { ...retry, status: "completed", completedAt };
}
