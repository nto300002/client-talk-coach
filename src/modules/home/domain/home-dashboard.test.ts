import { describe, expect, it } from "vitest";

import { buildHomeDashboard } from "@/modules/home/domain/home-dashboard";

describe("buildHomeDashboard", () => {
  it("returns the newest session summary, recording count, and recovery notice", () => {
    const dashboard = buildHomeDashboard({
      sessions: [
        { id: "latest", scenarioId: "initial-requirements-interview", difficultyLevel: 2 },
        { id: "older", scenarioId: "delay-report", difficultyLevel: 1 },
      ],
      reviews: [{ sessionId: "latest", tensionBefore: 7, tensionAfter: 5 }],
      recordingCount: 12,
      hasRecovery: true,
    });

    expect(dashboard).toEqual({
      latestPractice: { scenarioId: "initial-requirements-interview", difficultyLevel: 2, tensionBefore: 7, tensionAfter: 5 },
      recordingCount: 12,
      hasRecovery: true,
    });
  });

  it("uses an empty summary when no local practice has been saved", () => {
    expect(buildHomeDashboard({ sessions: [], reviews: [], recordingCount: 0, hasRecovery: false })).toEqual({
      latestPractice: null,
      recordingCount: 0,
      hasRecovery: false,
    });
  });
});
