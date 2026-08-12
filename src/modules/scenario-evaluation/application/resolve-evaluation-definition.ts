import type { StoredPracticeSession } from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";
import type { ScenarioDefinition } from "@/modules/scenario/domain/scenario-definition";

/**
 * Completed sessions are evaluated with their captured definition. Sessions created
 * before snapshots existed retain the legacy fixture fallback for compatibility.
 */
export function resolveEvaluationDefinition(
  session: StoredPracticeSession,
  currentDefinitions: ScenarioDefinition[],
): ScenarioDefinition | null {
  if (session.scenarioSnapshot) return session.scenarioSnapshot;
  return currentDefinitions.find((definition) => definition.id === session.scenarioId) ?? null;
}
