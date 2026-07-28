import { describe, expect, it } from "vitest";

import {
  validateScenarioDefinition,
  type ScenarioDefinition,
} from "@/modules/scenario/domain/scenario-definition";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";

const validScenario = technicalMvpScenarioFixtures[0];

function cloneScenario(overrides: Partial<ScenarioDefinition> = {}): ScenarioDefinition {
  return structuredClone({ ...validScenario, ...overrides });
}

describe("scenarioDefinitionSchema", () => {
  it("accepts the valid technical MVP scenario fixtures", () => {
    for (const scenario of technicalMvpScenarioFixtures) {
      expect(validateScenarioDefinition(scenario).success).toBe(true);
    }
  });

  it("rejects missing required fields", () => {
    const invalid = structuredClone(validScenario) as Partial<ScenarioDefinition>;
    delete invalid.displayName;

    expect(validateScenarioDefinition(invalid).success).toBe(false);
  });

  it("rejects duplicate fact IDs within a scenario", () => {
    const invalid = cloneScenario({
      facts: [
        validScenario.facts[0],
        {
          ...validScenario.facts[1],
          id: validScenario.facts[0].id,
        },
      ],
    });

    expect(validateScenarioDefinition(invalid).success).toBe(false);
  });

  it("rejects references to nonexistent fact IDs", () => {
    const invalid = cloneScenario({
      evaluationRubric: {
        ...validScenario.evaluationRubric,
        requiredFactIds: ["missing-fact"],
      },
    });

    expect(validateScenarioDefinition(invalid).success).toBe(false);
  });

  it("rejects invalid difficulty ordering", () => {
    const invalid = cloneScenario({
      difficultyProfiles: validScenario.difficultyProfiles.map((profile) =>
        profile.level === 4
          ? {
              ...profile,
              hiddenFactRatio: 0.05,
            }
          : profile,
      ),
    });

    expect(validateScenarioDefinition(invalid).success).toBe(false);
  });

  it("rejects strong pressure on level 1", () => {
    const invalid = cloneScenario({
      difficultyProfiles: validScenario.difficultyProfiles.map((profile) =>
        profile.level === 1
          ? {
              ...profile,
              pressureLevel: 2,
            }
          : profile,
      ),
    });

    expect(validateScenarioDefinition(invalid).success).toBe(false);
  });

  it("rejects abusive behavior even at level 5", () => {
    const invalid = cloneScenario({
      difficultyProfiles: validScenario.difficultyProfiles.map((profile) =>
        profile.level === 5
          ? {
              ...profile,
              prohibitedBehaviors: ["abusive"],
            }
          : profile,
      ),
    });

    expect(validateScenarioDefinition(invalid).success).toBe(false);
  });

  it("rejects incompatible client type references", () => {
    const invalid = cloneScenario({
      scenes: [
        {
          ...validScenario.scenes[0],
          allowedClientTypeIds: ["nonexistent-client-type"],
        },
      ],
    });

    expect(validateScenarioDefinition(invalid).success).toBe(false);
  });
});
