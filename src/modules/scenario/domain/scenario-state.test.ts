import { describe, expect, it } from "vitest";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";
import { createScenarioState, getFactsWithStatus, transitionScenarioState } from "./scenario-state";

const scenario = technicalMvpScenarioFixtures[0];

describe("scenario state", () => {
  it("keeps hidden facts out until a matching direct question makes them eligible", () => {
    const initial = createScenarioState(scenario);
    expect(getFactsWithStatus(scenario, initial, ["hidden"]).map((fact) => fact.id)).toContain("personal-information");

    const next = transitionScenarioState(scenario, initial, {
      id: "turn-1", type: "USER_QUESTION_CLASSIFIED", categories: ["security"],
    });
    expect(next.factStatuses["personal-information"]).toBe("eligible");
    expect(next.factStatuses["role-based-permissions"]).toBe("hidden");
  });

  it("processes the same event only once", () => {
    const initial = createScenarioState(scenario);
    const event = { id: "turn-1", type: "USER_QUESTION_CLASSIFIED" as const, categories: ["security"] };
    const next = transitionScenarioState(scenario, initial, event);
    expect(transitionScenarioState(scenario, next, event)).toBe(next);
  });

  it("keeps the user-turn evidence for a disclosed fact", () => {
    let state = createScenarioState(scenario);
    state = transitionScenarioState(scenario, state, {
      id: "question-1",
      type: "USER_QUESTION_CLASSIFIED",
      categories: ["security"],
    });

    state = transitionScenarioState(scenario, state, {
      id: "disclosed-1",
      type: "FACT_DISCLOSED",
      factId: "personal-information",
      evidenceTurnId: "user-turn-1",
    });

    expect(state.factEvidenceTurnIds?.["personal-information"]).toBe("user-turn-1");
  });
});
