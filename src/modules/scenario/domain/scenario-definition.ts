import { z } from "zod";

const idSchema = z.string().regex(/^[a-z][a-z0-9-]*$/, {
  message: "IDs must be stable kebab-case identifiers.",
});

export const difficultyLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const clientTypeSchema = z.object({
  id: idSchema,
  displayName: z.string().min(1),
  description: z.string().min(1),
  interactionStyle: z.string().min(1),
  cooperationLevel: z.number().int().min(1).max(5),
  itKnowledgeLevel: z.number().int().min(1).max(5),
});

export const scenarioFactSchema = z.object({
  id: idSchema,
  label: z.string().min(1),
  content: z.string().min(1),
  disclosureRule: z.enum([
    "initial",
    "direct-question",
    "deep-question",
    "customer-unknown",
    "other-person-required",
  ]),
  importance: z.enum(["critical", "normal"]),
  expectedQuestionCategories: z.array(idSchema).min(1),
});

export const difficultyProfileSchema = z.object({
  level: difficultyLevelSchema,
  displayName: z.string().min(1),
  hiddenFactRatio: z.number().min(0).max(1),
  ambiguityLevel: z.number().int().min(1).max(5),
  pressureLevel: z.number().int().min(0).max(3),
  contradictionCount: z.number().int().min(0).max(3),
  unexpectedQuestionCount: z.number().int().min(0).max(5),
  responseWaitToleranceSeconds: z.number().int().min(5).max(120),
  conversationTimeLimitMinutes: z.union([z.literal(5), z.literal(7), z.literal(10)]),
  prohibitedBehaviors: z.array(z.string()).default([]),
});

export const concreteSceneSchema = z.object({
  id: idSchema,
  version: z.number().int().positive(),
  displayName: z.string().min(1),
  description: z.string().min(1),
  practiceGoals: z.array(z.string().min(1)).min(1),
  openingMessage: z.string().min(1),
  requiredFactIds: z.array(idSchema),
  criticalFactIds: z.array(idSchema),
  allowedDifficultyLevels: z.array(difficultyLevelSchema).min(1),
  allowedClientTypeIds: z.array(idSchema).min(1),
});

export const evaluationRubricSchema = z.object({
  requiredFactIds: z.array(idSchema),
  criticalFactIds: z.array(idSchema),
  successConditionIds: z.array(idSchema).min(1),
  focusSkillIds: z.array(idSchema).min(1),
});

const baseScenarioDefinitionSchema = z.object({
  id: idSchema,
  version: z.number().int().positive(),
  status: z.enum(["enabled", "disabled"]),
  displayName: z.string().min(1),
  shortDescription: z.string().min(1),
  clientTypes: z.array(clientTypeSchema).min(1),
  facts: z.array(scenarioFactSchema).min(1),
  difficultyProfiles: z.array(difficultyProfileSchema).length(5),
  scenes: z.array(concreteSceneSchema).min(1),
  evaluationRubric: evaluationRubricSchema,
});

export const scenarioDefinitionSchema = baseScenarioDefinitionSchema.superRefine(
  (scenario, context) => {
    addUniqueIdIssues("facts", scenario.facts, context);
    addUniqueIdIssues("clientTypes", scenario.clientTypes, context);
    addUniqueIdIssues("scenes", scenario.scenes, context);
    validateDifficultyProfiles(scenario.difficultyProfiles, context);

    const factIds = new Set(scenario.facts.map((fact) => fact.id));
    const clientTypeIds = new Set(scenario.clientTypes.map((type) => type.id));
    const difficultyLevels = new Set(scenario.difficultyProfiles.map((profile) => profile.level));

    for (const factId of scenario.evaluationRubric.requiredFactIds) {
      addMissingReferenceIssue(factIds, factId, ["evaluationRubric", "requiredFactIds"], context);
    }

    for (const factId of scenario.evaluationRubric.criticalFactIds) {
      addMissingReferenceIssue(factIds, factId, ["evaluationRubric", "criticalFactIds"], context);
    }

    for (const [sceneIndex, scene] of scenario.scenes.entries()) {
      for (const factId of scene.requiredFactIds) {
        addMissingReferenceIssue(factIds, factId, ["scenes", sceneIndex, "requiredFactIds"], context);
      }

      for (const factId of scene.criticalFactIds) {
        addMissingReferenceIssue(factIds, factId, ["scenes", sceneIndex, "criticalFactIds"], context);
      }

      for (const clientTypeId of scene.allowedClientTypeIds) {
        addMissingReferenceIssue(
          clientTypeIds,
          clientTypeId,
          ["scenes", sceneIndex, "allowedClientTypeIds"],
          context,
        );
      }

      for (const level of scene.allowedDifficultyLevels) {
        if (!difficultyLevels.has(level)) {
          context.addIssue({
            code: "custom",
            message: `Difficulty level ${level} is not defined.`,
            path: ["scenes", sceneIndex, "allowedDifficultyLevels"],
          });
        }
      }
    }
  },
);

export type DifficultyLevel = z.infer<typeof difficultyLevelSchema>;
export type ScenarioDefinition = z.infer<typeof scenarioDefinitionSchema>;
export type ConcreteScene = z.infer<typeof concreteSceneSchema>;
export type ScenarioFact = z.infer<typeof scenarioFactSchema>;
export type DifficultyProfile = z.infer<typeof difficultyProfileSchema>;
export type EvaluationRubric = z.infer<typeof evaluationRubricSchema>;
export type ClientType = z.infer<typeof clientTypeSchema>;

export function parseScenarioDefinition(input: unknown): ScenarioDefinition {
  return scenarioDefinitionSchema.parse(input);
}

export function validateScenarioDefinition(input: unknown) {
  return scenarioDefinitionSchema.safeParse(input);
}

function addUniqueIdIssues(
  path: string,
  values: Array<{ id: string }>,
  context: z.RefinementCtx,
) {
  const seen = new Set<string>();

  for (const [index, value] of values.entries()) {
    if (seen.has(value.id)) {
      context.addIssue({
        code: "custom",
        message: `Duplicate id '${value.id}' is not allowed.`,
        path: [path, index, "id"],
      });
    }

    seen.add(value.id);
  }
}

function validateDifficultyProfiles(
  profiles: DifficultyProfile[],
  context: z.RefinementCtx,
) {
  const sorted = [...profiles].sort((a, b) => a.level - b.level);
  const levels = sorted.map((profile) => profile.level);

  for (const expectedLevel of [1, 2, 3, 4, 5] as const) {
    if (!levels.includes(expectedLevel)) {
      context.addIssue({
        code: "custom",
        message: `Difficulty level ${expectedLevel} is required.`,
        path: ["difficultyProfiles"],
      });
    }
  }

  for (const profile of sorted) {
    const lowerProhibited = profile.prohibitedBehaviors.map((behavior) => behavior.toLowerCase());

    if (profile.level === 1 && profile.pressureLevel > 1) {
      context.addIssue({
        code: "custom",
        message: "Level 1 disallows strong pressure.",
        path: ["difficultyProfiles", profile.level - 1, "pressureLevel"],
      });
    }

    if (
      lowerProhibited.some((behavior) =>
        ["abusive", "insulting", "discriminatory"].includes(behavior),
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Abusive, insulting, and discriminatory behavior is not allowed.",
        path: ["difficultyProfiles", profile.level - 1, "prohibitedBehaviors"],
      });
    }
  }

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];

    addNonDecreasingIssue(
      "hiddenFactRatio",
      previous.hiddenFactRatio,
      current.hiddenFactRatio,
      current.level,
      context,
    );
    addNonDecreasingIssue(
      "ambiguityLevel",
      previous.ambiguityLevel,
      current.ambiguityLevel,
      current.level,
      context,
    );
    addNonDecreasingIssue(
      "pressureLevel",
      previous.pressureLevel,
      current.pressureLevel,
      current.level,
      context,
    );
  }
}

function addMissingReferenceIssue(
  validIds: Set<string>,
  id: string,
  path: Array<string | number>,
  context: z.RefinementCtx,
) {
  if (!validIds.has(id)) {
    context.addIssue({
      code: "custom",
      message: `Reference '${id}' does not exist.`,
      path,
    });
  }
}

function addNonDecreasingIssue(
  propertyName: "hiddenFactRatio" | "ambiguityLevel" | "pressureLevel",
  previous: number,
  current: number,
  currentLevel: DifficultyLevel,
  context: z.RefinementCtx,
) {
  if (current < previous) {
    context.addIssue({
      code: "custom",
      message: `${propertyName} must not decrease as difficulty increases.`,
      path: ["difficultyProfiles", currentLevel - 1, propertyName],
    });
  }
}
