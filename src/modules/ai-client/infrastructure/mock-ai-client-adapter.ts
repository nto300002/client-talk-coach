import type { AiClientPort } from "@/modules/ai-client/application/generate-client-response";
import type { AiClientContext, AiClientResponse } from "@/modules/ai-client/domain/ai-client-contract";

export class MockAiClientAdapter implements AiClientPort {
  async respond(context: AiClientContext): Promise<AiClientResponse> {
    const fact = context.eligibleFacts[0];
    if (fact) return { text: fact.content, disclosedFactIds: [fact.id] };
    if (context.difficulty.pressureLevel >= 2) return { text: "確認に必要な点を、先に整理していただけますか？", disclosedFactIds: [] };
    return { text: "もう少し状況を教えてください。", disclosedFactIds: [] };
  }
}
