import { describe, expect, it, vi } from "vitest";

import {
  ProcessUserUtterance,
  TranscriptionProviderError,
  sanitizeTranscriptionError,
  type TranscriptionPort,
} from "@/modules/transcription/application/process-user-utterance";

const input = {
  audio: new Blob(["fixture-audio"], { type: "audio/webm" }),
  metadata: {
    sessionId: "session-1",
    utteranceId: "utterance-1",
    startedAtMs: 0,
    endedAtMs: 1_000,
    locale: "ja-JP" as const,
    mimeType: "audio/webm",
  },
};

describe("ProcessUserUtterance", () => {
  it("does not send silence to transcription", async () => {
    const port = fakePort();
    const useCase = new ProcessUserUtterance(port);

    await expect(useCase.execute({ ...input, isSpeech: false })).resolves.toEqual({ status: "ignored_silence" });
    expect(port.transcribe).not.toHaveBeenCalled();
  });

  it("retries retryable provider failures and returns a typed transcript turn", async () => {
    const port = fakePort();
    port.transcribe
      .mockRejectedValueOnce(new TranscriptionProviderError("STT_PROVIDER_UNAVAILABLE", true))
      .mockResolvedValueOnce(response());
    const useCase = new ProcessUserUtterance(port);

    await expect(useCase.execute({ ...input, isSpeech: true })).resolves.toEqual({
      status: "transcribed",
      turn: expect.objectContaining({ text: "実際に利用する職員は何人でしょうか" }),
    });
    expect(port.transcribe).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable failures", async () => {
    const port = fakePort();
    port.transcribe.mockRejectedValue(new TranscriptionProviderError("STT_UNSUPPORTED_MIME", false));
    const useCase = new ProcessUserUtterance(port);

    await expect(useCase.execute({ ...input, isSpeech: true })).rejects.toMatchObject({ code: "STT_UNSUPPORTED_MIME" });
    expect(port.transcribe).toHaveBeenCalledOnce();
  });

  it("sanitizes transcript and secret values from safe errors", () => {
    expect(sanitizeTranscriptionError(new Error("token=secret transcript=顧客の個人情報"))).toBe(
      "音声を文字に変換できませんでした。もう一度お試しください。",
    );
  });
});

function fakePort(): TranscriptionPort & { transcribe: ReturnType<typeof vi.fn> } {
  return { transcribe: vi.fn().mockResolvedValue(response()) };
}

function response() {
  return {
    utteranceId: "utterance-1",
    transcript: "実際に利用する職員は何人でしょうか",
    confidence: 0.93,
    startedAtMs: 0,
    endedAtMs: 1_000,
    isEmpty: false,
  };
}
