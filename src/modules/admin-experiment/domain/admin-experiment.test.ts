import { describe, expect, it } from "vitest";

import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";

import {
  comparePromptVersions,
  createNextScenarioVersion,
  developerFixture,
  validateScenarioJson,
} from "./admin-experiment";

const definition = technicalMvpScenarioFixtures[0];

describe("admin experiment domain", () => {
  it("rejects invalid scenario JSON and nonexistent references", () => {
    expect(validateScenarioJson("{").success).toBe(false);
    const invalid = structuredClone(definition);
    invalid.scenes[0].requiredFactIds = ["missing-fact"];
    const result = validateScenarioJson(JSON.stringify(invalid));
    expect(result).toMatchObject({ success: false });
    if (!result.success) expect(result.errors.join(" ")).toContain("does not exist");
  });

  it("preserves prior versions when a scenario is updated", () => {
    const first = createNextScenarioVersion(definition, [], "2026-08-04T00:00:00.000Z");
    const second = createNextScenarioVersion({ ...definition, shortDescription: "更新済み" }, [first], "2026-08-04T01:00:00.000Z");
    expect(first.version).toBe(1);
    expect(first.definition.shortDescription).toBe(definition.shortDescription);
    expect(second.version).toBe(2);
    expect(second.definition.shortDescription).toBe("更新済み");
  });

  it("returns separate comparison results for each prompt version", () => {
    const results = comparePromptVersions([
      { id: "prompt-a", name: "簡潔", instruction: "短く回答", version: 1, savedAt: "2026-08-04T00:00:00.000Z" },
      { id: "prompt-b", name: "確認重視", instruction: "確認を優先", version: 1, savedAt: "2026-08-04T00:00:00.000Z" },
    ], developerFixture);
    expect(results).toHaveLength(2);
    expect(results.map((result) => result.promptName)).toEqual(["簡潔", "確認重視"]);
    expect(results.every((result) => result.fixtureId === developerFixture.id)).toBe(true);
  });
});
