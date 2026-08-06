import { describe, expect, it } from "vitest";

import { buildPracticeConfirmationSummary } from "./page";

describe("practice confirmation summary", () => {
  it("resolves user-facing labels for every selected practice condition", () => {
    expect(buildPracticeConfirmationSummary({
      scenarioId: "initial-requirements-interview",
      scenarioVersion: 1,
      sceneId: "welfare-office-first-call",
      sceneVersion: 1,
      difficultyLevel: 2,
      clientTypeId: "low-it-knowledge-client",
      focusSkillId: "ask-questions",
      focusSkillSource: "user",
      durationMinutes: 7,
      tensionBefore: 4,
      confidenceBefore: 6,
    })).toEqual({
      scenario: "初回要件ヒアリング",
      scene: "福祉事業所の初回相談",
      clientType: "IT知識が少ない顧客",
      focusSkill: "質問を行う",
    });
  });
});
