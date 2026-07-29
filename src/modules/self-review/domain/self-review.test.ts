import { describe, expect, it } from "vitest";
import { createSelfReview, selfReviewInputSchema } from "./self-review";

const input = {
  sessionId: "session-1", tensionBefore: 7, confidenceBefore: 3, tensionAfter: 4, confidenceAfter: 6,
  completedConversation: true, askedNeededQuestions: true, blankedOut: false, canTryAgain: true, reflection: "質問できました。",
};

describe("self review", () => {
  it("accepts integer scores and calculates before and after differences", () => {
    expect(createSelfReview(input, "2026-07-29T00:00:00.000Z")).toMatchObject({ tensionDifference: -3, confidenceDifference: 3 });
  });

  it("rejects out-of-range or non-integer scores and too-long reflection", () => {
    expect(selfReviewInputSchema.safeParse({ ...input, tensionAfter: 10.5 }).success).toBe(false);
    expect(selfReviewInputSchema.safeParse({ ...input, confidenceAfter: 11 }).success).toBe(false);
    expect(selfReviewInputSchema.safeParse({ ...input, reflection: "a".repeat(501) }).success).toBe(false);
  });
});
