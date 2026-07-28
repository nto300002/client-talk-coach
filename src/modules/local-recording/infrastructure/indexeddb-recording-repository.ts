import Dexie, { type Table } from "dexie";

import {
  isStoredCompletedRecording,
  selectRecordingLimitCleanup,
  type RecordingChunk,
  type RecordingDeletionReason,
  type RecordingMetadata,
} from "@/modules/local-recording/domain/recording-limit";

export type StoredPracticeSession = {
  id: string;
  createdAt: string;
};

export type StoredAnalysis = {
  id: string;
  sessionId: string;
};

export class LocalPracticeDatabase extends Dexie {
  practiceSessions!: Table<StoredPracticeSession, string>;
  analyses!: Table<StoredAnalysis, string>;
  recordings!: Table<RecordingMetadata, string>;
  recordingChunks!: Table<RecordingChunk, string>;

  constructor(name = "client-talk-coach") {
    super(name);

    this.version(1).stores({
      practiceSessions: "id, createdAt",
      analyses: "id, sessionId",
      recordings: "id, sessionId, createdAt, status, deletedAt, isFavorite",
      recordingChunks: "id, recordingId, sequence",
    });
  }
}

export class IndexedDbRecordingRepository {
  constructor(private readonly database: LocalPracticeDatabase) {}

  async assertCanStartNewRecording(): Promise<void> {
    selectRecordingLimitCleanup(await this.listActiveRecordings());
  }

  async saveCompletedRecording(
    metadata: RecordingMetadata,
    chunks: RecordingChunk[],
    now = new Date().toISOString(),
  ): Promise<void> {
    const existing = await this.database.recordings.get(metadata.id);
    if (existing) {
      return;
    }

    const cleanupCandidate = selectRecordingLimitCleanup(await this.listActiveRecordings());

    await this.database.transaction(
      "rw",
      this.database.recordings,
      this.database.recordingChunks,
      async () => {
        await this.database.recordings.add({
          ...metadata,
          status: "completed",
          deletedAt: null,
          deletionReason: null,
        });
        await this.database.recordingChunks.bulkAdd(chunks);

        if (cleanupCandidate) {
          await this.database.recordings.update(cleanupCandidate.id, {
            status: "deleted",
            deletedAt: now,
            deletionReason: "recording_limit",
          });
          await this.deleteRecordingChunks(cleanupCandidate.id);
        }
      },
    );
  }

  async startRecording(metadata: RecordingMetadata): Promise<void> {
    await this.assertCanStartNewRecording();
    const existing = await this.database.recordings.get(metadata.id);
    if (existing) {
      return;
    }

    await this.database.recordings.add({
      ...metadata,
      status: "recording",
      deletedAt: null,
      deletionReason: null,
    });
  }

  async saveRecordingChunk(chunk: RecordingChunk): Promise<void> {
    const existing = await this.database.recordingChunks.get(chunk.id);
    if (!existing) {
      await this.database.recordingChunks.add(chunk);
    }
  }

  async completeRecording(recordingId: string, now = new Date().toISOString()): Promise<void> {
    const recording = await this.database.recordings.get(recordingId);
    if (!recording || recording.status === "completed") {
      return;
    }

    const activeRecordings = await this.listActiveRecordings();
    const cleanupCandidate = selectRecordingLimitCleanup(
      activeRecordings.filter((candidate) => candidate.id !== recordingId),
    );

    await this.database.transaction("rw", this.database.recordings, this.database.recordingChunks, async () => {
      await this.database.recordings.update(recordingId, {
        status: "completed",
        deletedAt: null,
        deletionReason: null,
      });

      if (cleanupCandidate) {
        await this.database.recordings.update(cleanupCandidate.id, {
          status: "deleted",
          deletedAt: now,
          deletionReason: "recording_limit",
        });
        await this.deleteRecordingChunks(cleanupCandidate.id);
      }
    });
  }

  async markRecordingRecoverable(recordingId: string): Promise<void> {
    const recording = await this.database.recordings.get(recordingId);
    if (!recording || recording.status === "completed" || recording.status === "deleted") {
      return;
    }
    await this.database.recordings.update(recordingId, { status: "recoverable" });
  }

  async countStoredCompletedRecordings(): Promise<number> {
    return (await this.listActiveRecordings()).filter(isStoredCompletedRecording).length;
  }

  async deleteVideo(recordingId: string, deletedAt = new Date().toISOString()): Promise<void> {
    await this.markVideoDeleted(recordingId, "manual", deletedAt);
  }

  async setFavorite(recordingId: string, isFavorite: boolean): Promise<void> {
    await this.database.recordings.update(recordingId, { isFavorite });
  }

  async findRecording(recordingId: string): Promise<RecordingMetadata | undefined> {
    return this.database.recordings.get(recordingId);
  }

  async findAnalysis(analysisId: string): Promise<StoredAnalysis | undefined> {
    return this.database.analyses.get(analysisId);
  }

  async removeExpiredRecordings(now: Date): Promise<number> {
    const expiration = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const expired = (await this.listActiveRecordings()).filter(
      (recording) =>
        isStoredCompletedRecording(recording) &&
        !recording.isFavorite &&
        Date.parse(recording.createdAt) < expiration,
    );

    await this.database.transaction("rw", this.database.recordings, this.database.recordingChunks, async () => {
      for (const recording of expired) {
        await this.markVideoDeleted(recording.id, "retention_expired", now.toISOString());
      }
    });

    return expired.length;
  }

  async savePracticeSession(session: StoredPracticeSession): Promise<void> {
    await this.database.practiceSessions.put(session);
  }

  async saveAnalysis(analysis: StoredAnalysis): Promise<void> {
    await this.database.analyses.put(analysis);
  }

  async deleteAllData(): Promise<void> {
    await this.database.transaction(
      "rw",
      this.database.practiceSessions,
      this.database.analyses,
      this.database.recordings,
      this.database.recordingChunks,
      async () => {
        await Promise.all([
          this.database.practiceSessions.clear(),
          this.database.analyses.clear(),
          this.database.recordings.clear(),
          this.database.recordingChunks.clear(),
        ]);
      },
    );
  }

  protected async deleteRecordingChunks(recordingId: string): Promise<void> {
    await this.database.recordingChunks.where("recordingId").equals(recordingId).delete();
  }

  private async markVideoDeleted(
    recordingId: string,
    deletionReason: Exclude<RecordingDeletionReason, null>,
    deletedAt: string,
  ): Promise<void> {
    await this.database.transaction("rw", this.database.recordings, this.database.recordingChunks, async () => {
      const recording = await this.database.recordings.get(recordingId);
      if (!recording || recording.status === "deleted") {
        return;
      }

      await this.database.recordings.update(recordingId, {
        status: "deleted",
        deletedAt,
        deletionReason,
      });
      await this.deleteRecordingChunks(recordingId);
    });
  }

  private async listActiveRecordings(): Promise<RecordingMetadata[]> {
    return (await this.database.recordings.toArray()).filter((recording) => recording.deletedAt === null);
  }
}
