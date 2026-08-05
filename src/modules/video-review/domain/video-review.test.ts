import { describe, expect, it } from "vitest";
import { markerSeekSeconds, retryDurationSeconds, retryTaskFor, sortReviewMarkers } from "./video-review";

describe("video review helpers", () => {
  it("sorts markers stably and maps their time within the video duration", () => {
    const markers = sortReviewMarkers([
      { category: "low_volume", timestampMs: 3_000, detail: "a", tone: "improvement" },
      { category: "filler", timestampMs: 1_000, detail: "b", tone: "improvement" },
    ]);
    expect(markers.map((marker) => marker.timestampMs)).toEqual([1_000, 3_000]);
    expect(markerSeekSeconds(markers[1], 2)).toBe(2);
  });

  it("keeps retry duration between thirty seconds and two minutes", () => {
    expect(retryDurationSeconds(10)).toBe(30);
    expect(retryDurationSeconds(60)).toBe(60);
    expect(retryDurationSeconds(300)).toBe(120);
    expect(retryTaskFor("structure")).toContain("結論");
  });
});
