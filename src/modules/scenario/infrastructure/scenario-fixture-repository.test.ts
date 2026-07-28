import { describe, expect, it } from "vitest";

import { createScenarioSessionReference } from "@/modules/scenario/application/scenario-session-reference";
import { ScenarioFixtureRepository } from "@/modules/scenario/infrastructure/scenario-fixture-repository";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";

describe("ScenarioFixtureRepository", () => {
  it("loads all enabled technical MVP scenarios", () => {
    const repository = new ScenarioFixtureRepository(technicalMvpScenarioFixtures);

    expect(repository.listEnabledScenarios().map((scenario) => scenario.id)).toEqual([
      "initial-requirements-interview",
      "scope-change-additional-request",
      "schedule-delay-explanation",
    ]);
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
