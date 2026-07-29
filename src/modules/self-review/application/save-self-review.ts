import { createSelfReview, type SelfReview, type SelfReviewInput } from "@/modules/self-review/domain/self-review";

export type SelfReviewRepository = {
  save(review: SelfReview): Promise<void>;
  findBySessionId(sessionId: string): Promise<SelfReview | null>;
};

export class SaveSelfReview {
  constructor(private readonly repository: SelfReviewRepository, private readonly now: () => string = () => new Date().toISOString()) {}

  async execute(input: SelfReviewInput): Promise<SelfReview> {
    const review = createSelfReview(input, this.now());
    await this.repository.save(review);
    return review;
  }
}
