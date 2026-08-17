import { describe, expect, it } from "vitest";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";
import { createScenarioState, transitionScenarioState } from "@/modules/scenario/domain/scenario-state";
import { evaluateScenario } from "./scenario-evaluation";

const definition = technicalMvpScenarioFixtures[0];

describe("evaluateScenario", () => {
  it("uses scenario fact IDs and prioritizes missing critical facts", () => {
    const state = createScenarioState(definition);
    const result = evaluateScenario(definition, state);
    expect(result.capturedFacts.map((fact) => fact.id)).toEqual(["current-excel-workflow"]);
    expect(result.missingCriticalFacts.map((fact) => fact.id)).toEqual(["personal-information", "role-based-permissions"]);
    expect(result.missingNormalFacts.map((fact) => fact.id)).toEqual(["mobile-usage"]);
  });

  it("produces the same result for the same state and records state evidence identifiers", () => {
    let state = createScenarioState(definition);
    state = transitionScenarioState(definition, state, { id: "question-1", type: "USER_QUESTION_CLASSIFIED", categories: ["security"] });
    state = transitionScenarioState(definition, state, {
      id: "disclose-1",
      type: "FACT_DISCLOSED",
      factId: "personal-information",
      evidenceTurnId: "turn-1",
    });
    const first = evaluateScenario(definition, state);
    expect(evaluateScenario(definition, state)).toEqual(first);
    expect(first.capturedFacts.find((fact) => fact.id === "personal-information")?.evidenceId).toBe("turn-1");
  });

  it("uses the selected scene rubric instead of unrelated scenario requirements", () => {
    const sceneSpecificDefinition = {
      ...definition,
      scenes: [{
        ...definition.scenes[0],
        requiredFactIds: ["mobile-usage"],
        criticalFactIds: ["mobile-usage"],
      }],
    };

    const result = evaluateScenario(sceneSpecificDefinition, createScenarioState(sceneSpecificDefinition), {}, sceneSpecificDefinition.scenes[0].id);

    expect(result.capturedFacts).toEqual([]);
    expect(result.missingCriticalFacts.map((fact) => fact.id)).toEqual(["mobile-usage"]);
    expect(result.missingNormalFacts).toEqual([]);
  });
});
