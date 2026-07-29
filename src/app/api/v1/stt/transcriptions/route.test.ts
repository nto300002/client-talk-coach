import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/v1/stt/transcriptions/route";

describe("POST /api/v1/stt/transcriptions", () => {
  it("validates multipart utterance input and returns a mock transcript without credentials", async () => {
    const body = new FormData();
    body.set("audio", new Blob(["fixture-audio"], { type: "audio/webm" }), "utterance.webm");
    body.set(
      "metadata",
      JSON.stringify({
        sessionId: "session-1",
        utteranceId: "utterance-1",
        startedAtMs: 0,
        endedAtMs: 1_000,
        locale: "ja-JP",
        mimeType: "audio/webm",
      }),
    );

    const response = await POST(new Request("http://localhost/api/v1/stt/transcriptions", { method: "POST", body }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { utteranceId: "utterance-1", transcript: "テスト発話を受け取りました", isEmpty: false },
    });
  });

  it("returns a safe validation error without echoing audio or metadata", async () => {
    const body = new FormData();
    body.set("audio", new Blob(["private audio"], { type: "video/webm" }), "utterance.webm");
    body.set("metadata", "not-json");

    const response = await POST(new Request("http://localhost/api/v1/stt/transcriptions", { method: "POST", body }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "STT_INVALID_AUDIO", message: "音声データを確認できませんでした。" },
    });
  });
});
