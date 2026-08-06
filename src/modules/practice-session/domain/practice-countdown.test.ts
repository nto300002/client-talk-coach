import { describe, expect, it } from "vitest";

import {
  advancePracticeCountdown,
  createPracticeCountdown,
  pausePracticeCountdown,
  resumePracticeCountdown,
} from "@/modules/practice-session/domain/practice-countdown";

describe("practice countdown", () => {
  it.each([
    [5, 300_000],
    [7, 420_000],
    [10, 600_000],
  ] as const)("uses the selected %i-minute duration", (durationMinutes, expectedDurationMs) => {
    const countdown = createPracticeCountdown(durationMinutes);

    expect(countdown).toMatchObject({ durationMs: expectedDurationMs, remainingMs: expectedDurationMs });
  });

  it("tracks elapsed and remaining time for the configured duration", () => {
    const countdown = createPracticeCountdown(5);
    const result = advancePracticeCountdown(countdown, 90_000);

    expect(result.countdown.elapsedMs).toBe(90_000);
    expect(result.countdown.remainingMs).toBe(210_000);
    expect(result.shouldWarnOneMinute).toBe(false);
    expect(result.shouldExpire).toBe(false);
  });

  it("notifies once when one minute remains and expires exactly once", () => {
    const countdown = createPracticeCountdown(5);
    const warning = advancePracticeCountdown(countdown, 240_000);
    const expired = advancePracticeCountdown(warning.countdown, 60_000);
    const repeated = advancePracticeCountdown(expired.countdown, 1_000);

    expect(warning.shouldWarnOneMinute).toBe(true);
    expect(expired.shouldExpire).toBe(true);
    expect(expired.countdown.remainingMs).toBe(0);
    expect(repeated.shouldExpire).toBe(false);
  });

  it("does not advance while paused and continues after resume", () => {
    const started = advancePracticeCountdown(createPracticeCountdown(7), 30_000).countdown;
    const paused = pausePracticeCountdown(started);
    const whilePaused = advancePracticeCountdown(paused, 120_000);
    const resumed = resumePracticeCountdown(whilePaused.countdown);
    const afterResume = advancePracticeCountdown(resumed, 1_000);

    expect(whilePaused.countdown.elapsedMs).toBe(30_000);
    expect(afterResume.countdown.elapsedMs).toBe(31_000);
  });
});
