import { describe, expect, it } from "vitest";

import {
  analyzeAudio,
  calculateRms,
  countJapaneseSpeechCharacters,
  detectFillers,
  findOverlaps,
} from "@/modules/audio-analysis/domain/audio-analysis";

describe("audio analysis", () => {
  it("calculates RMS for silence and audible samples", () => {
    expect(calculateRms([0, 0, 0])).toBe(0);
    expect(calculateRms([1, -1])).toBe(1);
  });

  it("detects low volume and long silence without treating silent frames as speech", () => {
    const result = analyzeAudio({
      baselineRms: 0.1,
      frames: [
        frame(0, 500, 0.07),
        frame(500, 500, 0),
        frame(1_000, 1_000, 0),
        frame(2_000, 500, 0.11),
      ],
      transcript: "はい、確認します。",
      aiSpeechIntervals: [],
    });

    expect(result.speechIntervals).toEqual([
      { startMs: 0, endMs: 500 },
      { startMs: 2_000, endMs: 2_500 },
    ]);
    expect(result.markers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "low_volume", timestampMs: 0 }),
        expect.objectContaining({ category: "long_silence", timestampMs: 500 }),
      ]),
    );
  });

  it("calculates Japanese speaking speed, standalone fillers, response delay, and AI overlap", () => {
    const result = analyzeAudio({
      baselineRms: 0.1,
      frames: [frame(2_000, 1_000, 0.12), frame(3_000, 1_000, 0.12)],
      transcript: "えー、確認します。そのため、続けます。",
      aiSpeechIntervals: [{ startMs: 1_500, endMs: 2_500 }],
    });

    expect(countJapaneseSpeechCharacters("確認します。  ")).toBe(5);
    expect(detectFillers("えー、確認します。そのため、続けます。")).toEqual([{ text: "えー", index: 0 }]);
    expect(result.firstResponseDelayMs).toBe(0);
    expect(result.speakingSpeedCharactersPerMinute).toBe(450);
    expect(result.markers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "filler", timestampMs: 2_000 }),
        expect.objectContaining({ category: "overlap", timestampMs: 2_000 }),
      ]),
    );
  });

  it("calculates partial and full overlaps deterministically", () => {
    expect(
      findOverlaps(
        [{ startMs: 100, endMs: 300 }, { startMs: 500, endMs: 800 }],
        [{ startMs: 200, endMs: 600 }],
      ),
    ).toEqual([
      { startMs: 200, endMs: 300 },
      { startMs: 500, endMs: 600 },
    ]);
  });

  it("processes a ten-minute synthetic fixture with valid timestamped markers", () => {
    const frames = Array.from({ length: 6_000 }, (_, index) =>
      frame(index * 100, 100, index % 20 === 0 ? 0 : 0.08),
    );

    const result = analyzeAudio({
      baselineRms: 0.1,
      frames,
      transcript: "確認します。",
      aiSpeechIntervals: [],
    });

    expect(result.averageRms).toBeGreaterThan(0);
    expect(result.markers.every((marker) => Number.isFinite(marker.timestampMs))).toBe(true);
  });
});

function frame(startMs: number, durationMs: number, rms: number) {
  return { startMs, durationMs, rms };
}
