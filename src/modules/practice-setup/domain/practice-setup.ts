import { z } from "zod";

import type {
  ClientType,
  ConcreteScene,
  DifficultyLevel,
  DifficultyProfile,
  ScenarioDefinition,
} from "@/modules/scenario/domain/scenario-definition";

const durationMinutesSchema = z.union([z.literal(5), z.literal(7), z.literal(10)]);
const selfAssessmentSchema = z
  .number({ error: "0から10の整数で入力してください。" })
  .int({ error: "0から10の整数で入力してください。" })
  .min(0, { error: "0から10の整数で入力してください。" })
  .max(10, { error: "0から10の整数で入力してください。" });

export const focusSkillLabels = {
  "voice-volume": "声量を保つ",
  "speak-slowly": "ゆっくり話す",
  "speak-conclusion-first": "結論から話す",
  "short-answer": "短く回答する",
  "ask-questions": "質問を行う",
  "organize-topics": "話を整理する",
  "summarize-client-needs": "相手の発言を要約する",
  "confirm-agreement": "認識を確認する",
  "rephrase-technical-terms": "技術用語を言い換える",
  "say-check-needed": "確認して回答すると伝える",
  "do-not-answer-immediately": "その場で即答しない",
  "decline-request": "断り方を練習する",
  "explain-additional-cost": "追加費用を説明する",
  "apologize-with-action": "謝罪と対応策を分ける",
  "summarize-meeting": "会議をまとめる",
  "set-next-action": "次の行動を決める",
  "confirm-client-concern": "相手の懸念を確認する",
} as const;

export type FocusSkillId = keyof typeof focusSkillLabels;
export type FocusSkillSelection = FocusSkillId | "auto";

export type PracticeSetupInput = {
  scenarioId?: string;
  sceneId?: string;
  difficultyLevel?: number;
  clientTypeId?: string;
  focusSkillId?: FocusSkillSelection;
  durationMinutes?: number;
  tensionBefore?: number;
  confidenceBefore?: number;
};

export type PracticeSetupConfiguration = {
  scenarioId: string;
  scenarioVersion: number;
  sceneId: string;
  sceneVersion: number;
  difficultyLevel: DifficultyLevel;
  clientTypeId: string;
  focusSkillId: FocusSkillId;
  focusSkillSource: "user" | "auto";
  durationMinutes: 5 | 7 | 10;
  tensionBefore: number;
  confidenceBefore: number;
};

export type FocusSkillHistoryItem = {
  focusSkillId: FocusSkillId;
  completedAt: string;
};

export type CompatibleSetupOptions = {
  scenes: ConcreteScene[];
  difficultyProfiles: DifficultyProfile[];
  clientTypes: ClientType[];
};

type ValidationSuccess = { success: true; data: PracticeSetupConfiguration };
type ValidationFailure = { success: false; errors: Record<string, string> };

const setupInputSchema = z.object({
  scenarioId: z.string().min(1, "シチュエーションを選択してください。"),
  sceneId: z.string().min(1, "具体的な場面を選択してください。"),
  difficultyLevel: z.number().int().min(1).max(5),
  clientTypeId: z.string().min(1, "顧客タイプを選択してください。"),
  focusSkillId: z.string().min(1, "重点練習項目を選択してください。"),
  durationMinutes: durationMinutesSchema,
  tensionBefore: selfAssessmentSchema,
  confidenceBefore: selfAssessmentSchema,
});

export function validatePracticeSetup(
  input: PracticeSetupInput,
  scenario: ScenarioDefinition,
  history: FocusSkillHistoryItem[] = [],
): ValidationSuccess | ValidationFailure {
  const parsedInput = setupInputSchema.safeParse(input);

  if (!parsedInput.success) {
    return { success: false, errors: toFieldErrors(parsedInput.error) };
  }

  const value = parsedInput.data;

  if (value.scenarioId !== scenario.id) {
    return failure("scenarioId", "選択したシチュエーションが見つかりません。");
  }

  const scene = scenario.scenes.find((candidate) => candidate.id === value.sceneId);
  if (!scene) {
    return failure("sceneId", "具体的な場面は選択したシチュエーションに含まれていません。");
  }

  if (!scene.allowedDifficultyLevels.includes(value.difficultyLevel as DifficultyLevel)) {
    return failure("difficultyLevel", "この場面では選択できない難易度です。");
  }

  if (!scene.allowedClientTypeIds.includes(value.clientTypeId)) {
    return failure("clientTypeId", "この場面では選択できない顧客タイプです。");
  }

  const focusSkill = resolveFocusSkill(value.focusSkillId as FocusSkillSelection, scenario, history);
  if (!focusSkill) {
    return failure("focusSkillId", "このシチュエーションでは選択できない重点練習項目です。");
  }

  return {
    success: true,
    data: {
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      sceneId: scene.id,
      sceneVersion: scene.version,
      difficultyLevel: value.difficultyLevel as DifficultyLevel,
      clientTypeId: value.clientTypeId,
      focusSkillId: focusSkill.id,
      focusSkillSource: focusSkill.source,
      durationMinutes: value.durationMinutes,
      tensionBefore: value.tensionBefore,
      confidenceBefore: value.confidenceBefore,
    },
  };
}

export function createPracticeSetup(
  input: PracticeSetupInput,
  scenario: ScenarioDefinition,
  history: FocusSkillHistoryItem[] = [],
): PracticeSetupConfiguration {
  const result = validatePracticeSetup(input, scenario, history);
  if (!result.success) {
    throw new PracticeSetupValidationError(result.errors);
  }

  return result.data;
}

export function getAutoFocusSkill(
  scenario: ScenarioDefinition,
  history: FocusSkillHistoryItem[],
): FocusSkillId {
  const supportedSkills = new Set(scenario.evaluationRubric.focusSkillIds);
  const latestSupported = [...history]
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
    .find((item) => supportedSkills.has(item.focusSkillId));

  return (latestSupported?.focusSkillId ?? scenario.evaluationRubric.focusSkillIds[0]) as FocusSkillId;
}

export function getCompatibleSetupOptions(scenario: ScenarioDefinition): CompatibleSetupOptions {
  const scenes = scenario.scenes;
  const allowedClientTypeIds = new Set(scenes.flatMap((scene) => scene.allowedClientTypeIds));
  const allowedDifficultyLevels = new Set(scenes.flatMap((scene) => scene.allowedDifficultyLevels));

  return {
    scenes,
    difficultyProfiles: scenario.difficultyProfiles.filter((profile) =>
      allowedDifficultyLevels.has(profile.level),
    ),
    clientTypes: scenario.clientTypes.filter((clientType) => allowedClientTypeIds.has(clientType.id)),
  };
}

export function getSceneCompatibleOptions(
  scenario: ScenarioDefinition,
  sceneId: string | undefined,
): CompatibleSetupOptions {
  const scene = scenario.scenes.find((candidate) => candidate.id === sceneId);
  if (!scene) {
    return { scenes: scenario.scenes, difficultyProfiles: [], clientTypes: [] };
  }

  return {
    scenes: [scene],
    difficultyProfiles: scenario.difficultyProfiles.filter((profile) =>
      scene.allowedDifficultyLevels.includes(profile.level),
    ),
    clientTypes: scenario.clientTypes.filter((clientType) =>
      scene.allowedClientTypeIds.includes(clientType.id),
    ),
  };
}

export class PracticeSetupValidationError extends Error {
  constructor(readonly fieldErrors: Record<string, string>) {
    super("Practice setup is invalid.");
    this.name = "PracticeSetupValidationError";
  }
}

function resolveFocusSkill(
  selection: FocusSkillSelection,
  scenario: ScenarioDefinition,
  history: FocusSkillHistoryItem[],
): { id: FocusSkillId; source: "user" | "auto" } | null {
  const focusSkillId = selection === "auto" ? getAutoFocusSkill(scenario, history) : selection;

  if (!scenario.evaluationRubric.focusSkillIds.includes(focusSkillId)) {
    return null;
  }

  return { id: focusSkillId as FocusSkillId, source: selection === "auto" ? "auto" : "user" };
}

function failure(field: string, message: string): ValidationFailure {
  return { success: false, errors: { [field]: message } };
}

function toFieldErrors(error: z.ZodError): Record<string, string> {
  return error.issues.reduce<Record<string, string>>((errors, issue) => {
    const field = String(issue.path[0] ?? "form");
    if (!errors[field]) {
      errors[field] = issue.message;
    }
    return errors;
  }, {});
}
