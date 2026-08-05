import type { ScenarioDefinition } from "@/modules/scenario/domain/scenario-definition";
import { parseScenarioDefinition } from "@/modules/scenario/domain/scenario-definition";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";

export type ScenarioSelectionItem = {
  id: string;
  version: number;
  displayName: string;
  shortDescription: string;
  sceneCount: number;
};

export class ScenarioFixtureRepository {
  constructor(private readonly fixtures: ScenarioDefinition[] = technicalMvpScenarioFixtures) {}

  listEnabledScenarios(): ScenarioDefinition[] {
    return this.fixtures
      .map((fixture) => parseScenarioDefinition(fixture))
      .filter((scenario) => scenario.status === "enabled");
  }

  listSelectionItems(): ScenarioSelectionItem[] {
    return this.listEnabledScenarios().map((scenario) => ({
      id: scenario.id,
      version: scenario.version,
      displayName: scenario.displayName,
      shortDescription: scenario.shortDescription,
      sceneCount: scenario.scenes.length,
    }));
  }
}

export const scenarioFixtureRepository = new ScenarioFixtureRepository();
