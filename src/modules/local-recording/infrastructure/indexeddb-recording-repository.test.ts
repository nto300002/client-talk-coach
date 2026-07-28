import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import {
  IndexedDbRecordingRepository,
  LocalPracticeDatabase,
} from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";
import type { RecordingMetadata } from "@/modules/local-recording/domain/recording-limit";

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
    await repository.deleteAllData();

    expect(await database.recordings.count()).toBe(0);
    expect(await database.recordingChunks.count()).toBe(0);
    expect(await database.practiceSessions.count()).toBe(0);
  });
});

function createRepository() {
  const database = new LocalPracticeDatabase(`client-talk-coach-test-${crypto.randomUUID()}`);
  databases.push(database);
  return { database, repository: new IndexedDbRecordingRepository(database) };
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
