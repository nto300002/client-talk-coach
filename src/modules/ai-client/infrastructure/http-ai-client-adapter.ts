import { AiClientProviderError, type AiClientPort } from "@/modules/ai-client/application/generate-client-response";
import type { AiClientContext, AiClientResponse } from "@/modules/ai-client/domain/ai-client-contract";

export class HttpAiClientAdapter implements AiClientPort {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async respond(context: AiClientContext): Promise<AiClientResponse> {
    let response: Response;
    try {
      response = await this.fetcher(endpoint(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        clientType: context.clientType,
        difficulty: context.difficulty,
        latestUserUtterance: { text: context.userText },
        recentTurns: context.recentTurns,
        scenarioContext: { eligibleFacts: context.eligibleFacts, disclosedFacts: context.disclosedFacts, prohibitedFactIds: context.prohibitedFactIds },
      }) });
    } catch { throw new AiClientProviderError(true); }
    if (!response.ok) throw new AiClientProviderError(response.status >= 500 || response.status === 429);
    const payload = await response.json() as { data?: AiClientResponse };
    if (!payload.data) throw new AiClientProviderError(true);
    return payload.data;
  }
}

function endpoint() { return typeof window === "undefined" ? "/api/v1/ai/client-responses" : new URL("/api/v1/ai/client-responses", window.location.origin).toString(); }
