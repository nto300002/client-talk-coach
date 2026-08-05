import { describe, expect, it } from "vitest";

import { deletionReasonMessage, filterByScenarioId, hasSamePracticeCondition } from "./practice-history";

const condition = {
  scenarioId: "initial-requirements-interview",
  sceneId: "welfare-office-first-call",
  difficultyLevel: 2,
  clientTypeId: "low-it-knowledge-client",
};

describe("practice history", () => {
  it("matches only sessions with all scenario conditions in common", () => {
    expect(hasSamePracticeCondition(condition, { ...condition })).toBe(true);
    expect(hasSamePracticeCondition(condition, { ...condition, difficultyLevel: 3 })).toBe(false);
  });

  it("maps a recording deletion reason to a user-facing message", () => {
    expect(deletionReasonMessage("recording_limit")).toBe("録画は保存上限により自動削除されました");
    expect(deletionReasonMessage("retention_expired")).toBe("保存期限により自動削除されました");
    expect(deletionReasonMessage(null)).toBeNull();
  });

  it("filters entries by scenario while keeping all entries for the default filter", () => {
    const entries = [{ scenarioId: "requirements" }, { scenarioId: "delay" }];
    expect(filterByScenarioId(entries, "requirements")).toEqual([{ scenarioId: "requirements" }]);
    expect(filterByScenarioId(entries, "all")).toEqual(entries);
  });
});
