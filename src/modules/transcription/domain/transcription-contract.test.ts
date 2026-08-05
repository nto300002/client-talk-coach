import { describe, expect, it } from "vitest";

import {
  TranscriptionValidationError,
  normalizeTranscriptionResponse,
  validateTranscriptionInput,
} from "@/modules/transcription/domain/transcription-contract";

describe("transcription contract", () => {
  const metadata = {
    sessionId: "session-1",
    utteranceId: "utterance-1",
    startedAtMs: 1_000,
    endedAtMs: 2_000,
    locale: "ja-JP" as const,
    mimeType: "audio/webm",
  };

  it("accepts supported user utterance audio and normalizes a provider response", () => {
    expect(() => validateTranscriptionInput({ audio: new Blob(["audio"], { type: "audio/webm" }), metadata })).not.toThrow();
    expect(
      normalizeTranscriptionResponse({
        utteranceId: "utterance-1",
        transcript: "確認します",
        confidence: 0.92,
        startedAtMs: 1_000,
        endedAtMs: 2_000,
        isEmpty: false,
      }),
    ).toEqual(expect.objectContaining({ transcript: "確認します", isEmpty: false }));
  });

  it("rejects unsupported, oversized, and overlong input before it reaches a provider", () => {
    expect(() => validateTranscriptionInput({ audio: new Blob(["audio"], { type: "video/webm" }), metadata })).toThrow(
      TranscriptionValidationError,
    );
    expect(() => validateTranscriptionInput({ audio: new Blob(["audio"], { type: "audio/webm" }), metadata: { ...metadata, endedAtMs: 31_001 } })).toThrow(
      TranscriptionValidationError,
    );
  });

  it("rejects malformed provider output", () => {
    expect(() => normalizeTranscriptionResponse({ utteranceId: "utterance-1", transcript: 42 })).toThrow(
      TranscriptionValidationError,
    );
  });
});
