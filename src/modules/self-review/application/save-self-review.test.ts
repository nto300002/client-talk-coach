import { describe, expect, it, vi } from "vitest";
import { SaveSelfReview, type SelfReviewRepository } from "./save-self-review";

describe("SaveSelfReview", () => {
  it("persists the review against its practice session", async () => {
    const repository: SelfReviewRepository = { save: vi.fn(), findBySessionId: vi.fn() };
    const review = await new SaveSelfReview(repository, () => "2026-07-29T00:00:00.000Z").execute({
      sessionId: "session-1", tensionBefore: 5, confidenceBefore: 5, tensionAfter: 4, confidenceAfter: 6,
      completedConversation: true, askedNeededQuestions: false, blankedOut: false, canTryAgain: true, reflection: "",
    });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "session-1", tensionDifference: -1, confidenceDifference: 1 }));
    expect(review.savedAt).toBe("2026-07-29T00:00:00.000Z");
  });
});
