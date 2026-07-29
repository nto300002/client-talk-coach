"use client";

import { useState } from "react";

import { ProcessUserUtterance } from "@/modules/transcription/application/process-user-utterance";
import { MockTranscriptionAdapter } from "@/modules/transcription/infrastructure/mock-transcription-adapter";

export default function TranscriptionTestPage() {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function transcribeFixture() {
    setError(null);
    try {
      const result = await new ProcessUserUtterance(new MockTranscriptionAdapter()).execute({
        audio: new Blob(["fixture-audio"], { type: "audio/webm" }),
        metadata: {
          sessionId: "fixture-session",
          utteranceId: "fixture-utterance",
          startedAtMs: 0,
          endedAtMs: 1_000,
          locale: "ja-JP",
          mimeType: "audio/webm",
        },
        isSpeech: true,
      });
      setTranscript(result.status === "transcribed" ? result.turn.text : "発話を検出できませんでした。");
    } catch {
      setError("音声を文字に変換できませんでした。もう一度お試しください。");
    }
  }

  return (
    <main>
      <section className="panel" aria-labelledby="transcription-test-title">
        <p className="eyebrow">ClientTalk Coach</p>
        <h1 id="transcription-test-title">文字起こしテスト</h1>
        <button className="primary-action" type="button" onClick={() => void transcribeFixture()}>
          フィクスチャ発話を文字起こしする
        </button>
        {transcript ? <p aria-live="polite">文字起こし: {transcript}</p> : null}
        {error ? <p className="status-error">{error}</p> : null}
      </section>
    </main>
  );
}
