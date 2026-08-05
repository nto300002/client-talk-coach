import { describe, expect, it } from "vitest";

import {
  createPracticeSetup,
  getAutoFocusSkill,
  getCompatibleSetupOptions,
  validatePracticeSetup,
} from "@/modules/practice-setup/domain/practice-setup";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";

const scenario = technicalMvpScenarioFixtures[0];
const scene = scenario.scenes[0];

const completeInput = {
  scenarioId: scenario.id,
  sceneId: scene.id,
  difficultyLevel: 2,
  clientTypeId: "low-it-knowledge-client",
  focusSkillId: "ask-questions",
  durationMinutes: 7,
  tensionBefore: 4,
  confidenceBefore: 6,
};

describe("practice setup", () => {
  it("creates a typed setup configuration for a complete compatible selection", () => {
    const result = createPracticeSetup(completeInput, scenario);

    expect(result).toMatchObject({
      ...completeInput,
      scenarioVersion: scenario.version,
      sceneVersion: scene.version,
      focusSkillSource: "user",
    });
  });

  it("rejects an incomplete setup", () => {
    const result = validatePracticeSetup(
      { ...completeInput, clientTypeId: undefined },
      scenario,
    );

    expect(result.success).toBe(false);
  });

  it("rejects a scene that does not belong to the selected situation", () => {
    const result = validatePracticeSetup(
      { ...completeInput, sceneId: "csv-export-added-late" },
      scenario,
    );

    expect(result.success).toBe(false);
  });

  it("rejects incompatible difficulty and client type combinations", () => {
    const difficultyResult = validatePracticeSetup(
      { ...completeInput, difficultyLevel: 9 },
      scenario,
    );
    const clientTypeResult = validatePracticeSetup(
      { ...completeInput, clientTypeId: "deadline-focused-client" },
      scenario,
    );

    expect(difficultyResult.success).toBe(false);
    expect(clientTypeResult.success).toBe(false);
  });

  it("accepts only 5, 7, and 10 minute durations", () => {
    expect(validatePracticeSetup({ ...completeInput, durationMinutes: 5 }, scenario).success).toBe(true);
    expect(validatePracticeSetup({ ...completeInput, durationMinutes: 7 }, scenario).success).toBe(true);
    expect(validatePracticeSetup({ ...completeInput, durationMinutes: 10 }, scenario).success).toBe(true);
    expect(validatePracticeSetup({ ...completeInput, durationMinutes: 6 }, scenario).success).toBe(false);
  });

  it("accepts tension and confidence only as integers from 0 to 10", () => {
    expect(validatePracticeSetup({ ...completeInput, tensionBefore: 0, confidenceBefore: 10 }, scenario).success).toBe(true);
    expect(validatePracticeSetup({ ...completeInput, tensionBefore: -1 }, scenario).success).toBe(false);
    expect(validatePracticeSetup({ ...completeInput, confidenceBefore: 5.5 }, scenario).success).toBe(false);
  });

  it("uses the most recent focus skill from history, then the scenario default", () => {
    expect(
      getAutoFocusSkill(scenario, [
        { focusSkillId: "confirm-agreement", completedAt: "2026-07-28T10:00:00.000Z" },
        { focusSkillId: "ask-questions", completedAt: "2026-07-27T10:00:00.000Z" },
      ]),
    ).toBe("confirm-agreement");
    expect(getAutoFocusSkill(scenario, [])).toBe("ask-questions");
  });

  it("returns only scenes, difficulties, and client types compatible with a scenario", () => {
    const options = getCompatibleSetupOptions(scenario);

    expect(options.scenes).toEqual([scene]);
    expect(options.difficultyProfiles).toHaveLength(5);
    expect(options.clientTypes.map((clientType) => clientType.id)).toEqual([
      "cooperative-client",
      "low-it-knowledge-client",
    ]);
  });
});
