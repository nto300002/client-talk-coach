import { describe, expect, it } from "vitest";
import { AiClientResponseValidationError, validateAiClientResponse } from "./ai-client-contract";

describe("validateAiClientResponse", () => {
  it("rejects multiple questions and ineligible disclosures", () => {
    expect(() => validateAiClientResponse({ text: "いつまでですか？予算はいくらですか？", disclosedFactIds: [] }, [])).toThrow(AiClientResponseValidationError);
    expect(() => validateAiClientResponse({ text: "確認します。", disclosedFactIds: ["hidden"] }, [])).toThrow(AiClientResponseValidationError);
  });

  it("accepts a short eligible response", () => {
    expect(validateAiClientResponse({ text: "個人情報を扱います。", disclosedFactIds: ["personal-information"] }, ["personal-information"])).toEqual({ text: "個人情報を扱います。", disclosedFactIds: ["personal-information"] });
  });
});
