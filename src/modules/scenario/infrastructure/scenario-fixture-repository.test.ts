import { describe, expect, it } from "vitest";

import { createScenarioSessionReference } from "@/modules/scenario/application/scenario-session-reference";
import { ScenarioFixtureRepository } from "@/modules/scenario/infrastructure/scenario-fixture-repository";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";

describe("ScenarioFixtureRepository", () => {
  it("loads all 11 enabled technical MVP business situations", () => {
    const repository = new ScenarioFixtureRepository(technicalMvpScenarioFixtures);

    expect(repository.listEnabledScenarios().map((scenario) => scenario.id)).toEqual([
      "initial-requirements-interview",
      "clarify-vague-request",
      "proposal-estimate-explanation",
      "specification-alignment",
      "progress-reporting",
      "incident-bug-handling",
      "complaint-handling",
      "delivery-acceptance-maintenance",
      "meeting-facilitation",
      "scope-change-additional-request",
      "schedule-delay-explanation",
    ]);
  });

  it("gives every enabled situation a selectable scene and all five difficulty levels", () => {
    const repository = new ScenarioFixtureRepository(technicalMvpScenarioFixtures);

    for (const scenario of repository.listEnabledScenarios()) {
      expect(scenario.scenes.length).toBeGreaterThan(0);
      expect(scenario.difficultyProfiles.map((profile) => profile.level)).toEqual([1, 2, 3, 4, 5]);
      expect(scenario.scenes.some((scene) => scene.allowedDifficultyLevels.length === 5)).toBe(true);
      expect(scenario.evaluationRubric.requiredFactIds.length).toBeGreaterThan(0);
    }
  });

  it("excludes disabled scenarios from normal selection", () => {
    const repository = new ScenarioFixtureRepository(technicalMvpScenarioFixtures);

    expect(repository.listSelectionItems().map((scenario) => scenario.displayName)).not.toContain(
      "Disabled Fixture Scenario",
    );
  });

  it("stores scenario and scene versions for session history references", () => {
    const repository = new ScenarioFixtureRepository(technicalMvpScenarioFixtures);
    const scenario = repository.listEnabledScenarios()[0];
    const scene = scenario.scenes[0];

    expect(createScenarioSessionReference(scenario, scene)).toEqual({
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      sceneId: scene.id,
      sceneVersion: scene.version,
    });
  });
});
