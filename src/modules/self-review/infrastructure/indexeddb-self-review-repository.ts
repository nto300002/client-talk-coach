import type { SelfReviewRepository } from "@/modules/self-review/application/save-self-review";
import type { SelfReview } from "@/modules/self-review/domain/self-review";
import { IndexedDbRecordingRepository, LocalPracticeDatabase } from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";

export class IndexedDbSelfReviewRepository implements SelfReviewRepository {
  constructor(private readonly repository = new IndexedDbRecordingRepository(new LocalPracticeDatabase())) {}

  async save(review: SelfReview): Promise<void> { await this.repository.saveSelfReview(review); }
  async findBySessionId(sessionId: string): Promise<SelfReview | null> { return this.repository.findSelfReview(sessionId); }
}
