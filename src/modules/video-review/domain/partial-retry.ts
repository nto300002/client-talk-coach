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

export function startPartialRetry(input: Omit<PartialRetryRecord, "id" | "createdAt" | "completedAt" | "status" | "responseText" | "responseCharacterCount"> & { id: string; createdAt: string }): PartialRetryRecord {
  return { ...input, completedAt: null, status: "active", responseText: "", responseCharacterCount: 0 };
}

export function completePartialRetry(retry: PartialRetryRecord, completedAt: string, responseText = ""): PartialRetryRecord {
  return retry.status === "completed" ? retry : { ...retry, status: "completed", completedAt, responseText, responseCharacterCount: responseText.replace(/[\s、。！？]/g, "").length };
}
