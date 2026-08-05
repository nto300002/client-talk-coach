"use client";

import { useState } from "react";

import { analyzePracticeAudio } from "@/modules/audio-analysis/application/analyze-practice-audio";
import type { AudioAnalysisResult } from "@/modules/audio-analysis/domain/audio-analysis";
import {
  IndexedDbRecordingRepository,
  LocalPracticeDatabase,
} from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";

export default function AudioAnalysisTestPage() {
  const [result, setResult] = useState<AudioAnalysisResult | null>(null);

  async function runFixture() {
    const repository = new IndexedDbRecordingRepository(new LocalPracticeDatabase("client-talk-coach-audio-e2e"));
    const analysis = await analyzePracticeAudio(
      {
        analysisId: "fixture-audio-analysis",
        sessionId: "fixture-session",
        baselineRms: 0.1,
        frames: [
          { startMs: 0, durationMs: 500, rms: 0.07 },
          { startMs: 500, durationMs: 1_500, rms: 0 },
          { startMs: 2_000, durationMs: 500, rms: 0.12 },
        ],
        transcript: "えー、確認します。",
        aiSpeechIntervals: [],
      },
      repository,
    );
    setResult(analysis);
  }

  return (
    <main>
      <section className="panel" aria-labelledby="audio-analysis-title">
        <p className="eyebrow">ClientTalk Coach</p>
        <h1 id="audio-analysis-title">音声分析テスト</h1>
        <button className="primary-action" type="button" onClick={() => void runFixture()}>
          フィクスチャ音声を分析する
        </button>
        {result ? (
          <section aria-labelledby="audio-marker-title">
            <h2 id="audio-marker-title">音声分析マーカー</h2>
            <ul>
              {result.markers.map((marker, index) => (
                <li key={`${marker.category}-${marker.timestampMs}-${index}`}>
                  {marker.category}: {marker.timestampMs}ms - {marker.detail}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
    </main>
  );
}
