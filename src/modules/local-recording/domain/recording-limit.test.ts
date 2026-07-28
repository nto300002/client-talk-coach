import { describe, expect, it } from "vitest";

import {
  RecordingLimitReachedError,
  selectRecordingLimitCleanup,
  type RecordingMetadata,
} from "@/modules/local-recording/domain/recording-limit";

function recording(id: string, createdAt: string, overrides: Partial<RecordingMetadata> = {}): RecordingMetadata {
  return {
    id,
    sessionId: `session-${id}`,
    createdAt,
    deletedAt: null,
    deletionReason: null,
    isFavorite: false,
    status: "completed",
    ...overrides,
  };
}

describe("selectRecordingLimitCleanup", () => {
  it("returns no candidate with 19 completed recordings", () => {
    const recordings = Array.from({ length: 19 }, (_, index) =>
      recording(`recording-${index}`, `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
    );

    expect(selectRecordingLimitCleanup(recordings)).toBeNull();
  });

  it("returns the oldest non-favorite completed recording at 20 recordings", () => {
    const recordings = Array.from({ length: 20 }, (_, index) =>
      recording(`recording-${index}`, `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
    );
    recordings[0] = recording("recording-0", "2026-07-01T00:00:00.000Z", { isFavorite: true });

    expect(selectRecordingLimitCleanup(recordings)?.id).toBe("recording-1");
  });

  it("uses the recording ID as a stable tie breaker", () => {
    const recordings = Array.from({ length: 20 }, (_, index) =>
      recording(`recording-${String(index).padStart(2, "0")}`, "2026-07-01T00:00:00.000Z"),
    );

    expect(selectRecordingLimitCleanup(recordings)?.id).toBe("recording-00");
  });

  it("excludes favorites from candidates and recoverable recordings from completed count", () => {
    const recordings = [
      ...Array.from({ length: 19 }, (_, index) => recording(`completed-${index}`, "2026-07-02T00:00:00.000Z")),
      recording("favorite", "2026-06-01T00:00:00.000Z", { isFavorite: true }),
      recording("recoverable", "2026-06-01T00:00:00.000Z", { status: "recoverable" }),
    ];

    expect(selectRecordingLimitCleanup(recordings)?.id).toBe("completed-0");
  });

  it("throws when all 20 completed recordings are favorites", () => {
    const recordings = Array.from({ length: 20 }, (_, index) =>
      recording(`recording-${index}`, "2026-07-01T00:00:00.000Z", { isFavorite: true }),
    );

    expect(() => selectRecordingLimitCleanup(recordings)).toThrow(RecordingLimitReachedError);
  });
});
