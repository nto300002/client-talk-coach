import type { ScenarioDefinition, ScenarioFact } from "@/modules/scenario/domain/scenario-definition";
import { getFactsWithStatus, type ScenarioState } from "@/modules/scenario/domain/scenario-state";

export type EvaluatedFact = Pick<ScenarioFact, "id" | "label" | "importance"> & { evidenceId: string | null };
export type ScenarioEvaluation = { capturedFacts: EvaluatedFact[]; missingCriticalFacts: EvaluatedFact[]; missingNormalFacts: EvaluatedFact[] };

export function evaluateScenario(
  definition: ScenarioDefinition,
  state: ScenarioState,
  evidenceByFactId: Record<string, string> = {},
  sceneId?: string,
): ScenarioEvaluation {
  const capturedIds = new Set(getFactsWithStatus(definition, state, ["disclosed", "confirmed"]).map((fact) => fact.id));
  const scene = sceneId ? definition.scenes.find((candidate) => candidate.id === sceneId) : undefined;
  if (sceneId && !scene) throw new Error(`Scenario does not contain scene: ${sceneId}`);
  const rubric = scene
    ? { requiredFactIds: scene.requiredFactIds, criticalFactIds: scene.criticalFactIds }
    : definition.evaluationRubric;
  const requiredIds = [...new Set([
    ...rubric.requiredFactIds,
    ...rubric.criticalFactIds,
  ])];
  const required = requiredIds.map((id) => requireFact(definition, id));
  const criticalIds = new Set(rubric.criticalFactIds);
  const evidence = { ...state.factEvidenceTurnIds, ...evidenceByFactId };
  const decorate = (fact: ScenarioFact): EvaluatedFact => ({ id: fact.id, label: fact.label, importance: criticalIds.has(fact.id) ? "critical" : fact.importance, evidenceId: evidence[fact.id] ?? null });
  const missing = required.filter((fact) => !capturedIds.has(fact.id)).map(decorate);
  return {
    capturedFacts: required.filter((fact) => capturedIds.has(fact.id)).map(decorate),
    missingCriticalFacts: missing.filter((fact) => fact.importance === "critical"),
    missingNormalFacts: missing.filter((fact) => fact.importance === "normal"),
  };
}

function requireFact(definition: ScenarioDefinition, factId: string): ScenarioFact {
  const fact = definition.facts.find((item) => item.id === factId);
  if (!fact) throw new Error(`Scenario rubric references missing fact: ${factId}`);
  return fact;
}
