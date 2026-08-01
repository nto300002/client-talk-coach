export type PartialRetry = { id: string; originalSessionId: string; category: string; durationSeconds: number; task: string; createdAt: string; completedAt: string | null };
const prefix = "client-talk-coach.partial-retries";

export function savePartialRetry(retry: PartialRetry) {
  const retries = loadPartialRetries(retry.originalSessionId);
  window.sessionStorage.setItem(keyFor(retry.originalSessionId), JSON.stringify([...retries, retry]));
}

export function loadPartialRetries(sessionId: string): PartialRetry[] {
  if (typeof window === "undefined") return [];
  const value = window.sessionStorage.getItem(keyFor(sessionId));
  return value ? JSON.parse(value) as PartialRetry[] : [];
}

function keyFor(sessionId: string) { return `${prefix}:${sessionId}`; }
