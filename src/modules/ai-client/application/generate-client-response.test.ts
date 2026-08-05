import { describe, expect, it, vi } from "vitest";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";
import { createScenarioState } from "@/modules/scenario/domain/scenario-state";
import { AiClientProviderError, GenerateClientResponse, buildAiClientContext, type AiClientPort, type SpeechSynthesisPort } from "./generate-client-response";

const definition = technicalMvpScenarioFixtures[0];
const userTurn = { id: "turn-1", speaker: "user" as const, text: "個人情報を扱いますか？" };

describe("GenerateClientResponse", () => {
  it("does not expose hidden facts in context and discloses matching eligible facts", async () => {
    const before = buildAiClientContext(definition, "low-it-knowledge-client", 2, createScenarioState(definition), userTurn, []);
    expect(before.prohibitedFactIds).toContain("personal-information");
    expect(before.eligibleFacts).toEqual([]);

    const ai = fakeAi({ text: "氏名、住所、支援記録などの個人情報を扱います。", disclosedFactIds: ["personal-information"] });
    const result = await new GenerateClientResponse(ai).execute({ definition, clientTypeId: "low-it-knowledge-client", difficultyLevel: 2, state: createScenarioState(definition), userTurn, recentTurns: [] });
    expect(result.state.factStatuses["personal-information"]).toBe("disclosed");
    expect(result.context.eligibleFacts.map((fact) => fact.id)).toEqual(["personal-information"]);
  });

  it("retries an AI failure and keeps text visible when TTS fails", async () => {
    const ai = fakeAi({ text: "確認してお伝えします。", disclosedFactIds: [] });
    ai.respond.mockRejectedValueOnce(new AiClientProviderError(true));
    const tts: SpeechSynthesisPort = { speak: vi.fn().mockRejectedValue(new Error("blocked")) };
    const result = await new GenerateClientResponse(ai, tts).execute({ definition, clientTypeId: "cooperative-client", difficultyLevel: 1, state: createScenarioState(definition), userTurn: { ...userTurn, id: "turn-2", text: "教えてください。" }, recentTurns: [] });
    expect(ai.respond).toHaveBeenCalledTimes(2);
    expect(result.response.text).toBe("確認してお伝えします。");
    expect(result.ttsStatus).toBe("failed");
  });
});

function fakeAi(response: { text: string; disclosedFactIds: string[] }): AiClientPort & { respond: ReturnType<typeof vi.fn> } {
  return { respond: vi.fn().mockResolvedValue(response) };
}
