import type { ScenarioDefinition, ScenarioFact } from "@/modules/scenario/domain/scenario-definition";
import { getFactsWithStatus, type ScenarioState } from "@/modules/scenario/domain/scenario-state";

export type EvaluatedFact = Pick<ScenarioFact, "id" | "label" | "importance"> & { evidenceId: string | null };
export type ScenarioEvaluation = { capturedFacts: EvaluatedFact[]; missingCriticalFacts: EvaluatedFact[]; missingNormalFacts: EvaluatedFact[] };

export function evaluateScenario(
  definition: ScenarioDefinition,
  state: ScenarioState,
  evidenceByFactId: Record<string, string> = {},
): ScenarioEvaluation {
  const capturedIds = new Set(getFactsWithStatus(definition, state, ["disclosed", "confirmed"]).map((fact) => fact.id));
  const requiredIds = [...new Set([
    ...definition.evaluationRubric.requiredFactIds,
    ...definition.evaluationRubric.criticalFactIds,
  ])];
  const required = requiredIds.map((id) => requireFact(definition, id));
  const criticalIds = new Set(definition.evaluationRubric.criticalFactIds);
  const decorate = (fact: ScenarioFact): EvaluatedFact => ({ id: fact.id, label: fact.label, importance: criticalIds.has(fact.id) ? "critical" : fact.importance, evidenceId: evidenceByFactId[fact.id] ?? null });
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
