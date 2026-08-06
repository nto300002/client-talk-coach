import Dexie, { type Table } from "dexie";

import type { AudioAnalysisResult } from "@/modules/audio-analysis/domain/audio-analysis";
import type { ConversationTurn } from "@/modules/conversation-analysis/domain/conversation-analysis";
import type { ConversationFeedback } from "@/modules/conversation-analysis/domain/conversation-feedback";
import type { ScenarioState } from "@/modules/scenario/domain/scenario-state";
import type { ScenarioEvaluation } from "@/modules/scenario-evaluation/domain/scenario-evaluation";
import type { SelfReview } from "@/modules/self-review/domain/self-review";

import {
  isStoredCompletedRecording,
  selectRecordingLimitCleanup,
  type RecordingChunk,
  type RecordingDeletionReason,
  type RecordingMetadata,
} from "@/modules/local-recording/domain/recording-limit";
import { hasSamePracticeCondition } from "@/modules/local-recording/domain/practice-history";

export type StoredPracticeSession = {
  id: string;
  createdAt: string;
  scenarioId: string;
  sceneId: string;
  difficultyLevel: number;
  clientTypeId: string;
  durationMinutes: number;
};

export type StoredAnalysis = {
  id: string;
  sessionId: string;
};

export type StoredAudioAnalysis = {
  id: string;
  sessionId: string;
  result: AudioAnalysisResult;
};

export type StoredConversation = {
  sessionId: string;
  turns: ConversationTurn[];
  scenarioState: ScenarioState;
};

export type StoredScenarioEvaluation = { sessionId: string; result: ScenarioEvaluation };
export type StoredConversationFeedback = { sessionId: string; result: ConversationFeedback };

export class LocalPracticeDatabase extends Dexie {
  practiceSessions!: Table<StoredPracticeSession, string>;
  analyses!: Table<StoredAnalysis, string>;
  recordings!: Table<RecordingMetadata, string>;
  recordingChunks!: Table<RecordingChunk, string>;
  selfReviews!: Table<SelfReview, string>;
  conversations!: Table<StoredConversation, string>;
  scenarioEvaluations!: Table<StoredScenarioEvaluation, string>;
  conversationFeedbacks!: Table<StoredConversationFeedback, string>;

  constructor(name = "client-talk-coach") {
    super(name);

    this.version(1).stores({
      practiceSessions: "id, createdAt",
      analyses: "id, sessionId",
      recordings: "id, sessionId, createdAt, status, deletedAt, isFavorite",
      recordingChunks: "id, recordingId, sequence",
    });

    this.version(2).stores({
      practiceSessions: "id, createdAt",
      analyses: "id, sessionId",
      recordings: "id, sessionId, createdAt, status, deletedAt, isFavorite",
      recordingChunks: "id, recordingId, sequence",
      selfReviews: "sessionId, savedAt",
      conversations: "sessionId",
      scenarioEvaluations: "sessionId",
      conversationFeedbacks: "sessionId",
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

  async findLatestRecordingForSession(sessionId: string): Promise<RecordingMetadata | undefined> {
    const recordings = await this.listRecordingsForSession(sessionId);
    return recordings
      .filter((recording) => recording.status === "completed" && recording.deletedAt === null)
      [0];
  }

  async findLatestRecordingMetadataForSession(sessionId: string): Promise<RecordingMetadata | undefined> {
    return (await this.listRecordingsForSession(sessionId))[0];
  }

  async loadRecordingBlob(recordingId: string): Promise<Blob | null> {
    const recording = await this.database.recordings.get(recordingId);
    if (!recording || recording.status !== "completed" || recording.deletedAt !== null) return null;
    const chunks = await this.database.recordingChunks.where("recordingId").equals(recordingId).sortBy("sequence");
    return chunks.length ? new Blob(chunks.map((chunk) => chunk.blob), { type: "video/webm" }) : null;
  }

  async findAnalysis(analysisId: string): Promise<StoredAnalysis | undefined> {
    return this.database.analyses.get(analysisId);
  }

  async saveAudioAnalysis(analysis: StoredAudioAnalysis): Promise<void> {
    await this.database.analyses.put(analysis);
  }

  async findAudioAnalysis(sessionId: string): Promise<StoredAudioAnalysis | undefined> {
    const analyses = await this.database.analyses.where("sessionId").equals(sessionId).toArray();
    return analyses.find((analysis): analysis is StoredAudioAnalysis => "result" in analysis);
  }

  async hasAnalysisForSession(sessionId: string): Promise<boolean> {
    return (await this.database.analyses.where("sessionId").equals(sessionId).count()) > 0;
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

  async savePracticeSession(session: Omit<StoredPracticeSession, "scenarioId" | "sceneId" | "difficultyLevel" | "clientTypeId" | "durationMinutes"> & Partial<Pick<StoredPracticeSession, "scenarioId" | "sceneId" | "difficultyLevel" | "clientTypeId" | "durationMinutes">>): Promise<void> {
    await this.database.practiceSessions.put({ scenarioId: "unknown", sceneId: "unknown", difficultyLevel: 0, clientTypeId: "unknown", durationMinutes: 0, ...session });
  }

  async listPracticeSessions(): Promise<StoredPracticeSession[]> {
    return (await this.database.practiceSessions.toArray()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async findPreviousMatchingSession(session: StoredPracticeSession): Promise<StoredPracticeSession | undefined> {
    return (await this.listPracticeSessions()).find(
      (candidate) => candidate.createdAt < session.createdAt && hasSamePracticeCondition(candidate, session),
    );
  }

  async deletePracticeSession(sessionId: string): Promise<void> {
    await this.database.transaction("rw", [
      this.database.practiceSessions,
      this.database.analyses,
      this.database.recordings,
      this.database.recordingChunks,
      this.database.selfReviews,
      this.database.conversations,
      this.database.scenarioEvaluations,
      this.database.conversationFeedbacks,
    ], async () => {
      await this.database.practiceSessions.delete(sessionId);
      await this.database.analyses.where("sessionId").equals(sessionId).delete();
      await this.database.selfReviews.delete(sessionId);
      await this.database.conversations.delete(sessionId);
      await this.database.scenarioEvaluations.delete(sessionId);
      await this.database.conversationFeedbacks.delete(sessionId);
      const recordings = await this.database.recordings.where("sessionId").equals(sessionId).toArray();
      if (recordings.length) await this.database.recordingChunks.where("recordingId").anyOf(recordings.map((recording) => recording.id)).delete();
      await this.database.recordings.where("sessionId").equals(sessionId).delete();
    });
  }

  async saveAnalysis(analysis: StoredAnalysis): Promise<void> {
    await this.database.analyses.put(analysis);
  }

  async deleteAllData(): Promise<void> {
    await this.database.transaction(
      "rw",
      [
        this.database.practiceSessions,
        this.database.analyses,
        this.database.recordings,
        this.database.recordingChunks,
        this.database.selfReviews,
        this.database.conversations,
        this.database.scenarioEvaluations,
        this.database.conversationFeedbacks,
      ],
      async () => {
        await Promise.all([
          this.database.practiceSessions.clear(),
          this.database.analyses.clear(),
          this.database.recordings.clear(),
          this.database.recordingChunks.clear(),
          this.database.selfReviews.clear(),
          this.database.conversations.clear(),
          this.database.scenarioEvaluations.clear(),
          this.database.conversationFeedbacks.clear(),
        ]);
      },
    );
  }

  protected async deleteRecordingChunks(recordingId: string): Promise<void> {
    await this.database.recordingChunks.where("recordingId").equals(recordingId).delete();
  }

  private async listRecordingsForSession(sessionId: string): Promise<RecordingMetadata[]> {
    return (await this.database.recordings.where("sessionId").equals(sessionId).toArray()).sort((left, right) => {
      const createdAtComparison = right.createdAt.localeCompare(left.createdAt);
      return createdAtComparison === 0 ? right.id.localeCompare(left.id) : createdAtComparison;
    });
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

  async saveSelfReview(review: SelfReview): Promise<void> { await this.database.selfReviews.put(review); }
  async findSelfReview(sessionId: string): Promise<SelfReview | null> { return (await this.database.selfReviews.get(sessionId)) ?? null; }
  async saveConversation(sessionId: string, turns: ConversationTurn[], scenarioState: ScenarioState): Promise<void> { await this.database.conversations.put({ sessionId, turns, scenarioState }); }
  async findConversation(sessionId: string): Promise<StoredConversation | null> { return (await this.database.conversations.get(sessionId)) ?? null; }
  async saveScenarioEvaluation(sessionId: string, result: ScenarioEvaluation): Promise<void> { await this.database.scenarioEvaluations.put({ sessionId, result }); }
  async findScenarioEvaluation(sessionId: string): Promise<ScenarioEvaluation | null> { return (await this.database.scenarioEvaluations.get(sessionId))?.result ?? null; }
  async saveConversationFeedback(sessionId: string, result: ConversationFeedback): Promise<void> { await this.database.conversationFeedbacks.put({ sessionId, result }); }
  async findConversationFeedback(sessionId: string): Promise<ConversationFeedback | null> { return (await this.database.conversationFeedbacks.get(sessionId))?.result ?? null; }
}
