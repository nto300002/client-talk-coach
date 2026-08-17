import type { ScenarioDefinition, ScenarioFact } from "@/modules/scenario/domain/scenario-definition";

export type FactStatus = "hidden" | "eligible" | "disclosed" | "confirmed";

export type ScenarioState = {
  factStatuses: Record<string, FactStatus>;
  /** User-turn IDs that caused a fact to be disclosed or confirmed. */
  factEvidenceTurnIds?: Record<string, string>;
  processedEventIds: string[];
};

export type ScenarioStateEvent =
  | { id: string; type: "USER_QUESTION_CLASSIFIED"; categories: string[] }
  | { id: string; type: "FOLLOW_UP_QUESTION"; factId: string }
  | { id: string; type: "FACT_DISCLOSED"; factId: string; evidenceTurnId?: string }
  | { id: string; type: "FACT_CONFIRMED"; factId: string; evidenceTurnId?: string };

export function createScenarioState(definition: ScenarioDefinition): ScenarioState {
  return {
    factStatuses: Object.fromEntries(
      definition.facts.map((fact) => [fact.id, fact.disclosureRule === "initial" ? "disclosed" : "hidden"]),
    ),
    factEvidenceTurnIds: {},
    processedEventIds: [],
  };
}

export function transitionScenarioState(
  definition: ScenarioDefinition,
  state: ScenarioState,
  event: ScenarioStateEvent,
): ScenarioState {
  if (state.processedEventIds.includes(event.id)) return state;

  const factStatuses = { ...state.factStatuses };
  const factEvidenceTurnIds = { ...state.factEvidenceTurnIds };
  if (event.type === "USER_QUESTION_CLASSIFIED") {
    for (const fact of definition.facts) {
      if (
        factStatuses[fact.id] === "hidden" &&
        fact.disclosureRule === "direct-question" &&
        fact.expectedQuestionCategories.some((category) => event.categories.includes(category))
      ) {
        factStatuses[fact.id] = "eligible";
      }
    }
  }

  if (event.type === "FOLLOW_UP_QUESTION") {
    const fact = getFact(definition, event.factId);
    if (fact && factStatuses[fact.id] === "hidden" && fact.disclosureRule === "deep-question") {
      factStatuses[fact.id] = "eligible";
    }
  }

  if (event.type === "FACT_DISCLOSED" && factStatuses[event.factId] === "eligible") {
    factStatuses[event.factId] = "disclosed";
    if (event.evidenceTurnId) factEvidenceTurnIds[event.factId] = event.evidenceTurnId;
  }

  if (event.type === "FACT_CONFIRMED" && factStatuses[event.factId] === "disclosed") {
    factStatuses[event.factId] = "confirmed";
    if (event.evidenceTurnId) factEvidenceTurnIds[event.factId] = event.evidenceTurnId;
  }

  return { factStatuses, factEvidenceTurnIds, processedEventIds: [...state.processedEventIds, event.id] };
}

export function getFactsWithStatus(
  definition: ScenarioDefinition,
  state: ScenarioState,
  statuses: FactStatus[],
): ScenarioFact[] {
  return definition.facts.filter((fact) => statuses.includes(state.factStatuses[fact.id]));
}

function getFact(definition: ScenarioDefinition, factId: string): ScenarioFact | undefined {
  return definition.facts.find((fact) => fact.id === factId);
}
