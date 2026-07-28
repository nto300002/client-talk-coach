import type {
  ConcreteScene,
  ScenarioDefinition,
} from "@/modules/scenario/domain/scenario-definition";

export type ScenarioSessionReference = {
  scenarioId: string;
  scenarioVersion: number;
  sceneId: string;
  sceneVersion: number;
};

export function createScenarioSessionReference(
  scenario: ScenarioDefinition,
  scene: ConcreteScene,
): ScenarioSessionReference {
  return {
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    sceneId: scene.id,
    sceneVersion: scene.version,
  };
}
