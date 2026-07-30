import { describe, expect, it } from "vitest";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";
import { createScenarioState } from "@/modules/scenario/domain/scenario-state";
import { evaluateScenario } from "@/modules/scenario-evaluation/domain/scenario-evaluation";
import { analyzeConversation } from "./conversation-analysis";
import { generateConversationFeedback, sanitizeText } from "./conversation-feedback";

describe("generateConversationFeedback", () => {
  it("prioritizes a missing critical requirement over a structure candidate", () => {
    const evaluation = evaluateScenario(technicalMvpScenarioFixtures[0], createScenarioState(technicalMvpScenarioFixtures[0]));
    const analysis = analyzeConversation([{ id: "u1", speaker: "user", text: "いろいろ確認が必要でデータベースの設計にも影響しますが、対応は可能です。" }]);
    const feedback = generateConversationFeedback(evaluation, analysis, "speak-conclusion-first");
    expect(feedback.primaryImprovement.category).toBe("missing-requirement");
    expect(feedback.primaryImprovement.description).toContain("個人情報");
  });

  it("uses the selected focus skill to break normal-priority ties", () => {
    const evaluation = { capturedFacts: [], missingCriticalFacts: [], missingNormalFacts: [] };
    const analysis = analyzeConversation([{ id: "u1", speaker: "user", text: "いろいろ確認が必要でデータベースの設計にも影響しますが、対応は可能です。" }]);
    const feedback = generateConversationFeedback(evaluation, analysis, "speak-conclusion-first");
    expect(feedback.primaryImprovement.category).toBe("structure");
  });

  it("removes prohibited diagnostic language and provides a gentle fallback", () => {
    expect(sanitizeText("あなたは不安を感じています。自信度は32%です。")).not.toMatch(/不安|自信度/);
    const feedback = generateConversationFeedback(
      { capturedFacts: [], missingCriticalFacts: [], missingNormalFacts: [] },
      analyzeConversation([]),
      "question",
    );
    expect(feedback.primaryImprovement.category).toBe("next-practice");
    expect(feedback.primaryImprovement.retryTask).not.toBe("");
  });
});
