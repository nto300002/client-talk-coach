import type { ConversationTurn } from "@/modules/conversation-analysis/domain/conversation-analysis";

const keyPrefix = "client-talk-coach.conversation-turns";

export function saveConversationTurns(sessionId: string, turns: ConversationTurn[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(keyFor(sessionId), JSON.stringify(turns));
}

export function loadConversationTurns(sessionId: string): ConversationTurn[] {
  if (typeof window === "undefined") return [];
  const stored = window.sessionStorage.getItem(keyFor(sessionId));
  return stored ? (JSON.parse(stored) as ConversationTurn[]) : [];
}

function keyFor(sessionId: string) { return `${keyPrefix}:${sessionId}`; }
