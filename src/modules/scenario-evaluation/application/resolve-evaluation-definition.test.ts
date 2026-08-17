import { describe, expect, it } from "vitest";

import type { StoredPracticeSession } from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";

import { resolveEvaluationDefinition } from "./resolve-evaluation-definition";

const fixture = technicalMvpScenarioFixtures[0];

describe("resolveEvaluationDefinition", () => {
  it("uses the saved scenario snapshot even when the current fixture has changed", () => {
    const historicalDefinition = {
      ...fixture,
      version: 1,
      displayName: "保存時の要件ヒアリング",
    };
    const session = practiceSession({
      scenarioVersion: 1,
      sceneVersion: historicalDefinition.scenes[0].version,
      scenarioSnapshot: historicalDefinition,
    });
    const currentDefinition = { ...fixture, version: 2, displayName: "現在の要件ヒアリング" };

    expect(resolveEvaluationDefinition(session, [currentDefinition])).toEqual(historicalDefinition);
  });

  it("uses the current fixture only for legacy sessions without a snapshot", () => {
    const session = practiceSession();

    expect(resolveEvaluationDefinition(session, [fixture])).toEqual(fixture);
  });
});

function practiceSession(overrides: Partial<StoredPracticeSession> = {}): StoredPracticeSession {
  return {
    id: "session-1",
    createdAt: "2026-08-12T00:00:00.000Z",
    scenarioId: fixture.id,
    sceneId: fixture.scenes[0].id,
    difficultyLevel: 1,
    clientTypeId: fixture.clientTypes[0].id,
    durationMinutes: 5,
    ...overrides,
  };
}
