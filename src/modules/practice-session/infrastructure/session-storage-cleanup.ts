import { SessionStorageSelfReviewRepository } from "@/modules/self-review/infrastructure/session-storage-self-review-repository";

const sessionScopedPrefixes = [
  "client-talk-coach.conversation-turns:",
  "client-talk-coach.conversation-feedback:",
  "client-talk-coach.retry:",
];
const scenarioStatesKey = "client-talk-coach.scenario-states";

export async function deleteSessionScopedStorage(sessionId: string): Promise<void> {
  await new SessionStorageSelfReviewRepository().deleteBySessionId(sessionId);

  for (const prefix of sessionScopedPrefixes) {
    window.sessionStorage.removeItem(`${prefix}${sessionId}`);
  }

  const storedStates = window.sessionStorage.getItem(scenarioStatesKey);
  if (!storedStates) return;

  const states = JSON.parse(storedStates) as Record<string, unknown>;
  delete states[sessionId];
  window.sessionStorage.setItem(scenarioStatesKey, JSON.stringify(states));
}

export async function clearPracticeSessionStorage(): Promise<void> {
  await new SessionStorageSelfReviewRepository().clear();
  window.sessionStorage.removeItem(scenarioStatesKey);
  window.sessionStorage.removeItem("client-talk-coach.practice-session");
  window.sessionStorage.removeItem("client-talk-coach.practice-setup");

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);
    if (key && sessionScopedPrefixes.some((prefix) => key.startsWith(prefix))) {
      window.sessionStorage.removeItem(key);
    }
  }
}
