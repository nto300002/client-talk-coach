import type { ConversationFeedback } from "@/modules/conversation-analysis/domain/conversation-feedback";
const prefix = "client-talk-coach.conversation-feedback";
export function saveConversationFeedback(sessionId: string, feedback: ConversationFeedback) { window.sessionStorage.setItem(`${prefix}:${sessionId}`, JSON.stringify(feedback)); }
export function loadConversationFeedback(sessionId: string): ConversationFeedback | null { const value = window.sessionStorage.getItem(`${prefix}:${sessionId}`); return value ? JSON.parse(value) as ConversationFeedback : null; }
