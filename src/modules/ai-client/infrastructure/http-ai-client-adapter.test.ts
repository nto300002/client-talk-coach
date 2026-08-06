import { describe, expect, it } from "vitest";
import { HttpAiClientAdapter } from "./http-ai-client-adapter";

describe("HttpAiClientAdapter", () => {
  it("sends only the client context and returns the typed response", async () => {
    const adapter = new HttpAiClientAdapter(async () => new Response(JSON.stringify({ data: { text: "承知しました。", disclosedFactIds: [] } }), { status: 200 }));
    await expect(adapter.respond({ clientName: "顧客", clientType: { displayName: "顧客", interactionStyle: "協力的に答える。", cooperationLevel: 3, itKnowledgeLevel: 2 }, difficulty: { ambiguityLevel: 1, pressureLevel: 0 }, userText: "質問です", recentTurns: [], disclosedFacts: [], eligibleFacts: [], prohibitedFactIds: [] })).resolves.toEqual({ text: "承知しました。", disclosedFactIds: [] });
  });
});
