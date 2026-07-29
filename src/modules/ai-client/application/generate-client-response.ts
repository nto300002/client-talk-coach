import { ApplicationError } from "@/domain/errors/application-error";
import {
  validateAiClientResponse,
  type AiClientContext,
  type AiClientResponse,
  type AiClientTurn,
} from "@/modules/ai-client/domain/ai-client-contract";
import type { DifficultyProfile, ScenarioDefinition } from "@/modules/scenario/domain/scenario-definition";
import {
  getFactsWithStatus,
  transitionScenarioState,
  type ScenarioState,
} from "@/modules/scenario/domain/scenario-state";

export type AiClientPort = { respond(context: AiClientContext): Promise<AiClientResponse> };
export type SpeechSynthesisPort = { speak(text: string): Promise<void> };

export class AiClientProviderError extends ApplicationError {
  constructor(readonly retryable: boolean) {
    super("AI_CLIENT_UNAVAILABLE", "AI顧客の応答を取得できませんでした。もう一度お試しください。");
    this.name = "AiClientProviderError";
  }
}

export type GenerateClientResponseInput = {
  definition: ScenarioDefinition;
  clientTypeId: string;
  difficultyLevel: number;
  state: ScenarioState;
  userTurn: AiClientTurn;
  recentTurns: AiClientTurn[];
};

export type GenerateClientResponseOutput = {
  response: AiClientResponse;
  state: ScenarioState;
  ttsStatus: "spoken" | "failed" | "unavailable";
  context: AiClientContext;
};

export class GenerateClientResponse {
  private readonly cached = new Map<string, GenerateClientResponseOutput>();

  constructor(
    private readonly aiClient: AiClientPort,
    private readonly speechSynthesis?: SpeechSynthesisPort,
    private readonly maximumAttempts = 2,
  ) {}

  async execute(input: GenerateClientResponseInput): Promise<GenerateClientResponseOutput> {
    const cacheKey = `${input.definition.id}:${input.userTurn.id}`;
    const cached = this.cached.get(cacheKey);
    if (cached) return cached;

    const categories = classifyQuestionCategories(input.userTurn.text);
    let state = transitionScenarioState(input.definition, input.state, {
      id: `question:${input.userTurn.id}`,
      type: "USER_QUESTION_CLASSIFIED",
      categories,
    });
    const context = buildAiClientContext(input.definition, input.clientTypeId, input.difficultyLevel, state, input.userTurn, input.recentTurns);
    const response = await this.requestWithRetry(context);
    for (const factId of response.disclosedFactIds) {
      state = transitionScenarioState(input.definition, state, {
        id: `disclosed:${input.userTurn.id}:${factId}`,
        type: "FACT_DISCLOSED",
        factId,
      });
    }

    let ttsStatus: GenerateClientResponseOutput["ttsStatus"] = "unavailable";
    if (this.speechSynthesis) {
      try {
        await this.speechSynthesis.speak(response.text);
        ttsStatus = "spoken";
      } catch {
        ttsStatus = "failed";
      }
    }
    const output = { response, state, ttsStatus, context };
    this.cached.set(cacheKey, output);
    return output;
  }

  private async requestWithRetry(context: AiClientContext): Promise<AiClientResponse> {
    let attempts = 0;
    while (attempts < this.maximumAttempts) {
      try {
        const response = await this.aiClient.respond(context);
        return validateAiClientResponse(response, context.eligibleFacts.map((fact) => fact.id));
      } catch (error) {
        attempts += 1;
        if (attempts >= this.maximumAttempts || !(error instanceof AiClientProviderError ? error.retryable : true)) throw error;
      }
    }
    throw new AiClientProviderError(true);
  }
}

export function buildAiClientContext(
  definition: ScenarioDefinition,
  clientTypeId: string,
  difficultyLevel: number,
  state: ScenarioState,
  userTurn: AiClientTurn,
  recentTurns: AiClientTurn[],
): AiClientContext {
  const clientType = definition.clientTypes.find((type) => type.id === clientTypeId);
  const difficulty = definition.difficultyProfiles.find((profile) => profile.level === difficultyLevel);
  if (!clientType || !difficulty) throw new AiClientProviderError(false);
  return {
    clientName: clientType.displayName,
    clientType,
    difficulty: pickDifficulty(difficulty),
    userText: userTurn.text,
    recentTurns: [...recentTurns, userTurn].slice(-6),
    disclosedFacts: getFactsWithStatus(definition, state, ["disclosed", "confirmed"]).map(toFactContext),
    eligibleFacts: getFactsWithStatus(definition, state, ["eligible"]).map(toFactContext),
    prohibitedFactIds: getFactsWithStatus(definition, state, ["hidden"]).map((fact) => fact.id),
  };
}

function pickDifficulty(profile: DifficultyProfile) {
  return { ambiguityLevel: profile.ambiguityLevel, pressureLevel: profile.pressureLevel };
}

function toFactContext(fact: { id: string; content: string }) { return { id: fact.id, content: fact.content }; }

export function classifyQuestionCategories(text: string): string[] {
  const categories = new Set<string>();
  if (/(個人情報|セキュリティ|住所|氏名|データ)/.test(text)) { categories.add("security"); categories.add("data-handling"); }
  if (/(権限|閲覧|編集|管理者)/.test(text)) categories.add("permission");
  if (/(スマホ|スマートフォン|端末|外出先)/.test(text)) categories.add("usage-environment");
  if (/(現在|業務|Excel|エクセル)/.test(text)) categories.add("current-workflow");
  if (/(予算|費用|金額)/.test(text)) categories.add("budget");
  if (/(納期|いつ|期限|日程)/.test(text)) categories.add("schedule");
  return [...categories];
}
