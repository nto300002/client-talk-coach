import { describe, expect, it } from "vitest";
import { analyzeConversation } from "./conversation-analysis";

describe("analyzeConversation", () => {
  it("classifies questions and recognizes conclusion-first answers with evidence", () => {
    const result = analyzeConversation([
      { id: "u1", speaker: "user", text: "個人情報は扱いますか？" },
      { id: "u2", speaker: "user", text: "可能です。まず利用者を確認させてください。" },
    ]);
    expect(result.questionCategories).toContain("security");
    expect(result.strengths.some((finding) => finding.evidenceTurnId === "u2" && finding.id.startsWith("conclusion-first"))).toBe(true);
  });

  it("finds a delayed conclusion and unexplained technical term", () => {
    const result = analyzeConversation([
      { id: "u1", speaker: "user", text: "いろいろ確認が必要でデータベースの設計にも影響しますが、対応は可能です。" },
    ]);
    expect(result.candidates.map((finding) => finding.id)).toContain("delayed-conclusion:u1");
    expect(result.candidates.some((finding) => finding.id.startsWith("unexplained-term:データベース"))).toBe(true);
  });

  it("does not flag a technical term when the user explains it", () => {
    const result = analyzeConversation([
      { id: "u1", speaker: "user", text: "APIとは、別のシステムとデータを受け渡すための接続口です。" },
    ]);
    expect(result.candidates.some((finding) => finding.id.startsWith("unexplained-term:API"))).toBe(false);
  });

  it("extracts agreements with their evidence", () => {
    const result = analyzeConversation([
      { id: "u1", speaker: "user", text: "こちらで影響範囲を確認し、明日までに連絡します。" },
    ]);
    expect(result.agreements).toEqual([expect.objectContaining({ responsibleParty: "開発側", deadline: "明日", evidenceTurnId: "u1" })]);
  });
});
