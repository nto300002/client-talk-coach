import { describe, expect, it } from "vitest";
import { completePartialRetry, startPartialRetry } from "./partial-retry";

describe("partial retry state", () => {
  it("starts incomplete and completes only after an explicit completion event", () => {
    const started = startPartialRetry({ id: "retry-1", originalSessionId: "session-1", category: "missing-requirement", durationSeconds: 60, task: "質問する", createdAt: "2026-08-01T00:00:00.000Z" });
    expect(started).toMatchObject({ status: "active", completedAt: null });
    expect(completePartialRetry(started, "2026-08-01T00:01:00.000Z", "結論から確認します。")).toMatchObject({ status: "completed", completedAt: "2026-08-01T00:01:00.000Z", responseText: "結論から確認します。", responseCharacterCount: 9 });
  });
});
