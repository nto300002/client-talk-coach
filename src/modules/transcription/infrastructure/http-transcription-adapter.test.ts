import { describe, expect, it, vi } from "vitest";

import { HttpTranscriptionAdapter } from "@/modules/transcription/infrastructure/http-transcription-adapter";

describe("HttpTranscriptionAdapter", () => {
  it("sends only an utterance segment and normalizes the API response", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            utteranceId: "utterance-1",
            transcript: "確認します",
            startedAtMs: 0,
            endedAtMs: 1_000,
            isEmpty: false,
          },
        }),
      ),
    );
    const adapter = new HttpTranscriptionAdapter(fetcher);

    await expect(
      adapter.transcribe({
        audio: new Blob(["fixture-audio"], { type: "audio/webm" }),
        metadata: {
          sessionId: "session-1",
          utteranceId: "utterance-1",
          startedAtMs: 0,
          endedAtMs: 1_000,
          locale: "ja-JP",
          mimeType: "audio/webm",
        },
      }),
    ).resolves.toMatchObject({ transcript: "確認します" });

    const [, options] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(fetcher).toHaveBeenCalledWith("/api/v1/stt/transcriptions", expect.objectContaining({ method: "POST" }));
    expect(options.body).toBeInstanceOf(FormData);
  });
});
