import { analyzeConversation, type ConversationTurn } from "@/modules/conversation-analysis/domain/conversation-analysis";
import {
  parseScenarioDefinition,
  validateScenarioDefinition,
  type ScenarioDefinition,
} from "@/modules/scenario/domain/scenario-definition";

export type ScenarioVersion = {
  id: string;
  scenarioId: string;
  version: number;
  definition: ScenarioDefinition;
  savedAt: string;
};

export type PromptVersion = {
  id: string;
  name: string;
  instruction: string;
  version: number;
  savedAt: string;
};

export type ExperimentModel = "mock-standard" | "mock-strict";

export type DeveloperFixture = {
  id: string;
  label: string;
  turns: ConversationTurn[];
};

export type PromptComparisonResult = {
  promptVersionId: string;
  promptName: string;
  fixtureId: string;
  questionCategoryCount: number;
  candidateCount: number;
  strengthCount: number;
  focus: string;
  focusFindingCount: number;
  coverageGapCount: number;
  model: ExperimentModel;
};

export const developerFixture: DeveloperFixture = {
  id: "developer-requirements-fixture-v1",
  label: "開発者作成: 初回ヒアリング会話",
  turns: [
    { id: "client-1", speaker: "client", text: "Excel管理をシステム化したいのですが、何から相談すればよいでしょうか。" },
    { id: "user-1", speaker: "user", text: "現在の業務で、特に時間がかかっている作業を教えてください。" },
    { id: "client-2", speaker: "client", text: "支援記録の転記に時間がかかっています。" },
    { id: "user-2", speaker: "user", text: "個人情報の扱いと、職員ごとの閲覧権限も確認させてください。" },
  ],
};

export function validateScenarioJson(json: string):
  | { success: true; definition: ScenarioDefinition }
  | { success: false; errors: string[] } {
  try {
    const input = JSON.parse(json) as unknown;
    const result = validateScenarioDefinition(input);
    if (result.success) return { success: true, definition: result.data };
    return { success: false, errors: result.error.issues.map((issue) => `${issue.path.join(".") || "scenario"}: ${issue.message}`) };
  } catch {
    return { success: false, errors: ["JSONの形式が正しくありません。"] };
  }
}

export function createNextScenarioVersion(
  definition: ScenarioDefinition,
  priorVersions: ScenarioVersion[],
  savedAt: string,
): ScenarioVersion {
  const version = Math.max(0, ...priorVersions.map((item) => item.version)) + 1;
  return {
    id: `${definition.id}:v${version}`,
    scenarioId: definition.id,
    version,
    definition: parseScenarioDefinition({ ...definition, version }),
    savedAt,
  };
}

export function duplicateScenario(definition: ScenarioDefinition): ScenarioDefinition {
  return parseScenarioDefinition({
    ...definition,
    id: `${definition.id}-copy`,
    version: 1,
    displayName: `${definition.displayName}（複製）`,
  });
}

export function comparePromptVersions(
  promptVersions: PromptVersion[],
  fixture: DeveloperFixture,
  model: ExperimentModel = "mock-standard",
): PromptComparisonResult[] {
  const analysis = analyzeConversation(fixture.turns);
  return promptVersions.map((prompt) => ({
    promptVersionId: prompt.id,
    promptName: prompt.name,
    fixtureId: fixture.id,
    questionCategoryCount: analysis.questionCategories.length,
    candidateCount: analysis.candidates.length,
    strengthCount: analysis.strengths.length,
    ...evaluatePromptFocus(prompt.instruction, analysis, model),
    model,
  }));
}

function evaluatePromptFocus(
  instruction: string,
  analysis: ReturnType<typeof analyzeConversation>,
  model: ExperimentModel,
) {
  const normalized = instruction.toLowerCase();
  const focus = normalized.includes("確認") || normalized.includes("質問")
    ? "確認質問"
    : normalized.includes("短") || normalized.includes("三文")
      ? "簡潔さ"
      : "会話構造";

  const focusFindingCount = focus === "確認質問"
    ? analysis.questionCategories.length + analysis.strengths.filter((finding) => finding.category === "agreement").length
    : focus === "簡潔さ"
      ? analysis.candidates.filter((finding) => finding.category === "structure").length
      : analysis.candidates.length + analysis.strengths.length;

  const coverageGapCount = model === "mock-strict"
    ? ["purpose", "current-workflow", "security", "permission"].filter(
        (category) => !analysis.questionCategories.includes(category as typeof analysis.questionCategories[number]),
      ).length
    : 0;

  return { focus, focusFindingCount, coverageGapCount };
}
