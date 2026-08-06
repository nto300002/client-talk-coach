import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/v1/ai/client-responses", () => {
  it("returns only an explicitly eligible fact from the mock AI client", async () => {
    const request = new Request("http://localhost/api/v1/ai/client-responses", {
      method: "POST",
      body: JSON.stringify({
        latestUserUtterance: { text: "個人情報を扱いますか？" },
        clientType: { displayName: "IT知識が少ない顧客", interactionStyle: "専門用語を避けた説明を求める。", cooperationLevel: 4, itKnowledgeLevel: 1 },
        difficulty: { ambiguityLevel: 2, pressureLevel: 0 },
        scenarioContext: {
          disclosedFacts: [],
          eligibleFacts: [{ id: "personal-information", content: "氏名、住所、支援記録などの個人情報を扱う。" }],
          prohibitedFactIds: ["role-based-permissions"],
        },
      }),
    });

    const response = await POST(request);
    await expect(response.json()).resolves.toEqual({
      data: { text: "氏名、住所、支援記録などの個人情報を扱う。", disclosedFactIds: ["personal-information"] },
    });
  });
});
