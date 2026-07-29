import type { SelfReviewRepository } from "@/modules/self-review/application/save-self-review";
import type { SelfReview } from "@/modules/self-review/domain/self-review";

const storageKey = "client-talk-coach.self-reviews";

export class SessionStorageSelfReviewRepository implements SelfReviewRepository {
  async save(review: SelfReview): Promise<void> {
    const all = this.read();
    all[review.sessionId] = review;
    window.sessionStorage.setItem(storageKey, JSON.stringify(all));
  }

  async findBySessionId(sessionId: string): Promise<SelfReview | null> {
    return this.read()[sessionId] ?? null;
  }

  private read(): Record<string, SelfReview> {
    const stored = window.sessionStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as Record<string, SelfReview>) : {};
  }
}
