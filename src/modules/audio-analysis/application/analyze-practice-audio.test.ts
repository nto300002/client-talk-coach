import { describe, expect, it, vi } from "vitest";

import { analyzePracticeAudio } from "@/modules/audio-analysis/application/analyze-practice-audio";

describe("analyzePracticeAudio", () => {
  it("persists timestamped local audio analysis after calculation", async () => {
    const saveAudioAnalysis = vi.fn().mockResolvedValue(undefined);

    const result = await analyzePracticeAudio(
      {
        analysisId: "audio-1",
        sessionId: "session-1",
        baselineRms: 0.1,
        frames: [{ startMs: 0, durationMs: 500, rms: 0.07 }],
        transcript: "えー、確認します。",
        aiSpeechIntervals: [],
      },
      { saveAudioAnalysis },
    );

    expect(result.markers).toEqual(expect.arrayContaining([expect.objectContaining({ category: "low_volume" })]));
    expect(saveAudioAnalysis).toHaveBeenCalledWith(expect.objectContaining({ id: "audio-1", sessionId: "session-1" }));
  });
});
