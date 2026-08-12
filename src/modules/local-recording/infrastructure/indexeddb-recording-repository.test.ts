import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import {
  IndexedDbRecordingRepository,
  LocalPracticeDatabase,
} from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";
import type { RecordingMetadata } from "@/modules/local-recording/domain/recording-limit";
import type { AudioAnalysisResult } from "@/modules/audio-analysis/domain/audio-analysis";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";

const databases: LocalPracticeDatabase[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()));
});

describe("IndexedDbRecordingRepository", () => {
  it("saves a new recording before deleting the oldest non-favorite video and its chunks", async () => {
    const { database, repository } = createRepository();
    const oldest = recording("recording-00", "2026-07-01T00:00:00.000Z");

    for (let index = 0; index < 20; index += 1) {
      const metadata = index === 0 ? oldest : recording(`recording-${index}`, `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`);
      await repository.saveCompletedRecording(metadata, [chunk(metadata.id)]);
    }

    await repository.savePracticeSession({ id: oldest.sessionId, createdAt: oldest.createdAt });
    await repository.saveAnalysis({ id: "analysis-00", sessionId: oldest.sessionId });
    await repository.saveCompletedRecording(recording("recording-20", "2026-07-25T00:00:00.000Z"), [chunk("recording-20")]);

    expect(await repository.countStoredCompletedRecordings()).toBe(20);
    expect(await database.recordings.get(oldest.id)).toMatchObject({
      status: "deleted",
      deletionReason: "recording_limit",
    });
    expect(await database.recordingChunks.where("recordingId").equals(oldest.id).count()).toBe(0);
    expect(await database.practiceSessions.get(oldest.sessionId)).not.toBeNull();
    expect(await database.analyses.get("analysis-00")).not.toBeNull();
  });

  it("does not delete existing recordings when saving a new recording fails", async () => {
    const { database, repository } = createRepository();

    for (let index = 0; index < 20; index += 1) {
      const metadata = recording(`recording-${index}`, `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`);
      await repository.saveCompletedRecording(metadata, [chunk(metadata.id)]);
    }

    await expect(
      repository.saveCompletedRecording(recording("recording-20", "2026-07-25T00:00:00.000Z"), [invalidChunk("recording-20")]),
    ).rejects.toThrow();

    expect(await repository.countStoredCompletedRecordings()).toBe(20);
    expect(await database.recordings.get("recording-0")).toMatchObject({ status: "completed" });
  });

  it("keeps IndexedDB consistent when deleting old chunks fails", async () => {
    const { database, repository } = createRepository();

    for (let index = 0; index < 20; index += 1) {
      const metadata = recording(`recording-${index}`, `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`);
      await repository.saveCompletedRecording(metadata, [chunk(metadata.id)]);
    }

    (repository as unknown as { deleteRecordingChunks: (recordingId: string) => Promise<void> }).deleteRecordingChunks =
      async () => Promise.reject(new Error("chunk cleanup failed"));

    await expect(
      repository.saveCompletedRecording(recording("recording-20", "2026-07-25T00:00:00.000Z"), [chunk("recording-20")]),
    ).rejects.toThrow("chunk cleanup failed");

    expect(await repository.countStoredCompletedRecordings()).toBe(20);
    expect(await database.recordings.get("recording-0")).toMatchObject({ status: "completed" });
    expect(await database.recordings.get("recording-20")).toBeUndefined();
  });

  it("is idempotent when the same saved recording is submitted twice", async () => {
    const { repository } = createRepository();
    const metadata = recording("recording-00", "2026-07-01T00:00:00.000Z");

    await repository.saveCompletedRecording(metadata, [chunk(metadata.id)]);
    await repository.saveCompletedRecording(metadata, [chunk(metadata.id)]);

    expect(await repository.countStoredCompletedRecordings()).toBe(1);
  });

  it("persists recording chunks incrementally and marks interrupted recordings recoverable", async () => {
    const { database, repository } = createRepository();
    const metadata = { ...recording("recording-live", "2026-07-01T00:00:00.000Z"), status: "recording" as const };

    await repository.startRecording(metadata);
    await repository.saveRecordingChunk(chunk(metadata.id));
    await repository.markRecordingRecoverable(metadata.id);

    expect(await database.recordingChunks.where("recordingId").equals(metadata.id).count()).toBe(1);
    expect(await database.recordings.get(metadata.id)).toMatchObject({ status: "recoverable" });
  });

  it("completes an incrementally persisted recording without duplicating its chunks", async () => {
    const { repository } = createRepository();
    const metadata = { ...recording("recording-live", "2026-07-01T00:00:00.000Z"), status: "recording" as const };

    await repository.startRecording(metadata);
    await repository.saveRecordingChunk(chunk(metadata.id));
    await repository.completeRecording(metadata.id);
    await repository.completeRecording(metadata.id);

    expect(await repository.findRecording(metadata.id)).toMatchObject({ status: "completed" });
    expect(await repository.countStoredCompletedRecordings()).toBe(1);
  });

  it("deletes video metadata and chunks manually but preserves session and analysis", async () => {
    const { database, repository } = createRepository();
    const metadata = recording("recording-00", "2026-07-01T00:00:00.000Z");

    await repository.saveCompletedRecording(metadata, [chunk(metadata.id)]);
    await repository.savePracticeSession({ id: metadata.sessionId, createdAt: metadata.createdAt });
    await repository.saveAnalysis({ id: "analysis-00", sessionId: metadata.sessionId });
    await repository.deleteVideo(metadata.id, "2026-07-28T00:00:00.000Z");

    expect(await database.recordings.get(metadata.id)).toMatchObject({
      status: "deleted",
      deletionReason: "manual",
    });
    expect(await database.recordingChunks.where("recordingId").equals(metadata.id).count()).toBe(0);
    expect(await database.practiceSessions.get(metadata.sessionId)).not.toBeNull();
    expect(await database.analyses.get("analysis-00")).not.toBeNull();
  });

  it("removes non-favorite recordings after 30 days and keeps favorites", async () => {
    const { database, repository } = createRepository();
    const expired = recording("recording-expired", "2026-06-01T00:00:00.000Z");
    const favorite = { ...recording("recording-favorite", "2026-06-01T00:00:00.000Z"), isFavorite: true };

    await repository.saveCompletedRecording(expired, [chunk(expired.id)]);
    await repository.saveCompletedRecording(favorite, [chunk(favorite.id)]);

    expect(await repository.removeExpiredRecordings(new Date("2026-07-02T00:00:00.000Z"))).toBe(1);
    expect(await database.recordings.get(expired.id)).toMatchObject({
      status: "deleted",
      deletionReason: "retention_expired",
    });
    expect(await database.recordings.get(favorite.id)).toMatchObject({ status: "completed" });
  });

  it("deletes all local data", async () => {
    const { database, repository } = createRepository();
    const metadata = recording("recording-00", "2026-07-01T00:00:00.000Z");

    await repository.saveCompletedRecording(metadata, [chunk(metadata.id)]);
    await repository.savePracticeSession({ id: metadata.sessionId, createdAt: metadata.createdAt });
    await repository.saveAnalysis({ id: "analysis-00", sessionId: metadata.sessionId });
    await repository.deleteAllData();

    expect(await database.recordings.count()).toBe(0);
    expect(await database.recordingChunks.count()).toBe(0);
    expect(await database.practiceSessions.count()).toBe(0);
    expect(await database.analyses.count()).toBe(0);
  });

  it("lists sessions newest first and finds the latest prior session with the same conditions", async () => {
    const { repository } = createRepository();
    const matching = practiceSession("session-matching", "2026-07-01T00:00:00.000Z");
    const differentDifficulty = {
      ...practiceSession("session-different", "2026-07-03T00:00:00.000Z"),
      difficultyLevel: 3,
    };
    const current = practiceSession("session-current", "2026-07-04T00:00:00.000Z");

    await repository.savePracticeSession(matching);
    await repository.savePracticeSession(differentDifficulty);
    await repository.savePracticeSession(current);

    await expect(repository.listPracticeSessions()).resolves.toEqual([current, differentDifficulty, matching]);
    await expect(repository.findPreviousMatchingSession(current)).resolves.toEqual(matching);
    await expect(repository.findPreviousMatchingSession(matching)).resolves.toBeUndefined();
  });

  it("deletes a practice session and its video data without affecting another session", async () => {
    const { database, repository } = createRepository();
    const target = practiceSession("session-target", "2026-07-01T00:00:00.000Z");
    const remaining = practiceSession("session-remaining", "2026-07-02T00:00:00.000Z");
    const targetRecording = { ...recording("recording-target", target.createdAt), sessionId: target.id };
    const remainingRecording = { ...recording("recording-remaining", remaining.createdAt), sessionId: remaining.id };

    await repository.savePracticeSession(target);
    await repository.savePracticeSession(remaining);
    await repository.saveAnalysis({ id: "analysis-target", sessionId: target.id });
    await repository.saveAnalysis({ id: "analysis-remaining", sessionId: remaining.id });
    await repository.saveSelfReview({ sessionId: target.id, tensionBefore: 1, confidenceBefore: 1, tensionAfter: 1, confidenceAfter: 1, completedConversation: true, askedNeededQuestions: false, blankedOut: false, canTryAgain: true, reflection: "", savedAt: "now", tensionDifference: 0, confidenceDifference: 0 });
    await repository.saveConversation(target.id, [], { factStatuses: {}, processedEventIds: [] });
    await repository.saveScenarioEvaluation(target.id, { capturedFacts: [], missingCriticalFacts: [], missingNormalFacts: [] });
    await repository.saveConversationFeedback(target.id, { strengths: [], primaryImprovement: { category: "next-practice", description: "next", evidenceId: "session", retryTask: "retry" } });
    await repository.saveCompletedRecording(targetRecording, [chunk(targetRecording.id)]);
    await repository.saveCompletedRecording(remainingRecording, [chunk(remainingRecording.id)]);

    await repository.deletePracticeSession(target.id);

    expect(await database.practiceSessions.get(target.id)).toBeUndefined();
    expect(await database.analyses.where("sessionId").equals(target.id).count()).toBe(0);
    expect(await database.recordings.where("sessionId").equals(target.id).count()).toBe(0);
    expect(await database.recordingChunks.where("recordingId").equals(targetRecording.id).count()).toBe(0);
    expect(await repository.findSelfReview(target.id)).toBeNull();
    expect(await repository.findConversation(target.id)).toBeNull();
    expect(await repository.findScenarioEvaluation(target.id)).toBeNull();
    expect(await repository.findConversationFeedback(target.id)).toBeNull();
    expect(await database.practiceSessions.get(remaining.id)).toEqual(remaining);
    expect(await database.analyses.where("sessionId").equals(remaining.id).count()).toBe(1);
    expect(await database.recordings.where("sessionId").equals(remaining.id).count()).toBe(1);
  });

  it("saves and loads audio analysis independently from recording video data", async () => {
    const { repository } = createRepository();
    const analysis = audioAnalysis("session-audio");

    await repository.saveAudioAnalysis(analysis);

    await expect(repository.findAudioAnalysis("session-audio")).resolves.toEqual(analysis);
  });

  it("persists self review and private conversation analysis by session", async () => {
    const { repository } = createRepository();
    const sessionId = "session-private-data";
    const state = { factStatuses: { fact: "disclosed" as const }, processedEventIds: ["event-1"] };
    const feedback = { strengths: [], primaryImprovement: { category: "next-practice" as const, description: "次の質問を確認します。", evidenceId: "turn-1", retryTask: "一つ質問してください。" } };
    const evaluation = { capturedFacts: [], missingCriticalFacts: [], missingNormalFacts: [] };
    const review = { sessionId, tensionBefore: 5, confidenceBefore: 4, tensionAfter: 3, confidenceAfter: 6, completedConversation: true, askedNeededQuestions: true, blankedOut: false, canTryAgain: true, reflection: "", savedAt: "2026-08-06T00:00:00.000Z", tensionDifference: -2, confidenceDifference: 2 };

    await repository.saveSelfReview(review);
    await repository.saveConversation(sessionId, [{ id: "turn-1", speaker: "user" as const, text: "確認します" }], state);
    await repository.saveScenarioEvaluation(sessionId, evaluation);
    await repository.saveConversationFeedback(sessionId, feedback);

    await expect(repository.findSelfReview(sessionId)).resolves.toEqual(review);
    await expect(repository.findConversation(sessionId)).resolves.toEqual({ sessionId, turns: [{ id: "turn-1", speaker: "user", text: "確認します" }], scenarioState: state });
    await expect(repository.findScenarioEvaluation(sessionId)).resolves.toEqual(evaluation);
    await expect(repository.findConversationFeedback(sessionId)).resolves.toEqual(feedback);
  });

  it("persists the scenario version and immutable definition snapshot with a practice session", async () => {
    const { repository } = createRepository();
    const definition = technicalMvpScenarioFixtures[0];
    const session = {
      ...practiceSession("session-versioned", "2026-08-12T00:00:00.000Z"),
      scenarioVersion: definition.version,
      sceneVersion: definition.scenes[0].version,
      scenarioSnapshot: definition,
    };

    await repository.savePracticeSession(session);

    await expect(repository.findPracticeSession(session.id)).resolves.toEqual(session);
  });
});

function createRepository() {
  const database = new LocalPracticeDatabase(`client-talk-coach-test-${crypto.randomUUID()}`);
  databases.push(database);
  return { database, repository: new IndexedDbRecordingRepository(database) };
}

function audioAnalysis(sessionId: string): { id: string; sessionId: string; result: AudioAnalysisResult } {
  return {
    id: `audio-${sessionId}`,
    sessionId,
    result: {
      averageRms: 0.07,
      speechIntervals: [{ startMs: 0, endMs: 500 }],
      firstResponseDelayMs: 0,
      speakingSpeedCharactersPerMinute: 240,
      fillerCount: 0,
      markers: [{ category: "low_volume", timestampMs: 0, detail: "個人基準より小さい音量です。" }],
    },
  };
}

function recording(id: string, createdAt: string): RecordingMetadata {
  return {
    id,
    sessionId: `session-${id}`,
    createdAt,
    deletedAt: null,
    deletionReason: null,
    isFavorite: false,
    status: "completed",
  };
}

function practiceSession(id: string, createdAt: string) {
  return {
    id,
    createdAt,
    scenarioId: "requirements-hearing",
    sceneId: "welfare-first-call",
    difficultyLevel: 2,
    clientTypeId: "low-it-literacy",
    durationMinutes: 7,
  };
}

function chunk(recordingId: string) {
  return {
    id: `chunk-${recordingId}`,
    recordingId,
    sequence: 0,
    createdAt: "2026-07-01T00:00:00.000Z",
    blob: new Blob(["recording"], { type: "video/webm" }),
  };
}

function invalidChunk(recordingId: string) {
  return {
    ...chunk(recordingId),
    id: undefined as unknown as string,
  };
}
