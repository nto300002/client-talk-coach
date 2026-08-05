import {
  createNextScenarioVersion,
  type PromptVersion,
  type ScenarioVersion,
} from "@/modules/admin-experiment/domain/admin-experiment";
import type { ScenarioDefinition } from "@/modules/scenario/domain/scenario-definition";

const scenarioVersionsKey = "client-talk-coach.admin.scenario-versions";
const promptVersionsKey = "client-talk-coach.admin.prompt-versions";

export class LocalStorageAdminExperimentRepository {
  listScenarioVersions(scenarioId: string): ScenarioVersion[] {
    return this.read<ScenarioVersion[]>(scenarioVersionsKey, [])
      .filter((item) => item.scenarioId === scenarioId)
      .sort((left, right) => right.version - left.version);
  }

  saveScenario(definition: ScenarioDefinition, savedAt = new Date().toISOString()): ScenarioVersion {
    const all = this.read<ScenarioVersion[]>(scenarioVersionsKey, []);
    const next = createNextScenarioVersion(definition, all.filter((item) => item.scenarioId === definition.id), savedAt);
    window.localStorage.setItem(scenarioVersionsKey, JSON.stringify([...all, next]));
    return next;
  }

  listPromptVersions(): PromptVersion[] {
    return this.read<PromptVersion[]>(promptVersionsKey, []).sort((left, right) => left.name.localeCompare(right.name));
  }

  savePrompt(input: Omit<PromptVersion, "version" | "savedAt">, savedAt = new Date().toISOString()): PromptVersion {
    const all = this.read<PromptVersion[]>(promptVersionsKey, []);
    const existing = all.filter((item) => item.id === input.id);
    const next: PromptVersion = {
      ...input,
      version: Math.max(0, ...existing.map((item) => item.version)) + 1,
      savedAt,
    };
    window.localStorage.setItem(promptVersionsKey, JSON.stringify([...all, next]));
    return next;
  }

  private read<T>(key: string, fallback: T): T {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  }
}
