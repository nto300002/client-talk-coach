import type { PartialRetryRecord } from "@/modules/video-review/domain/partial-retry";
export type PartialRetry = PartialRetryRecord;
const prefix = "client-talk-coach.partial-retries";

export function savePartialRetry(retry: PartialRetry) {
  const retries = loadPartialRetries(retry.originalSessionId);
  const index = retries.findIndex((item) => item.id === retry.id);
  const next = index === -1 ? [...retries, retry] : retries.map((item) => item.id === retry.id ? retry : item);
  window.sessionStorage.setItem(keyFor(retry.originalSessionId), JSON.stringify(next));
}

export function loadPartialRetries(sessionId: string): PartialRetry[] {
  if (typeof window === "undefined") return [];
  const value = window.sessionStorage.getItem(keyFor(sessionId));
  return value ? JSON.parse(value) as PartialRetry[] : [];
}

function keyFor(sessionId: string) { return `${prefix}:${sessionId}`; }
