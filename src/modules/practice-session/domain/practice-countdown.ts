export type PracticeCountdown = {
  durationMs: number;
  elapsedMs: number;
  remainingMs: number;
  isPaused: boolean;
  hasWarnedOneMinute: boolean;
  hasExpired: boolean;
};

export type PracticeCountdownAdvanceResult = {
  countdown: PracticeCountdown;
  shouldWarnOneMinute: boolean;
  shouldExpire: boolean;
};

const oneMinuteMs = 60_000;

export function createPracticeCountdown(durationMinutes: 5 | 7 | 10): PracticeCountdown {
  const durationMs = durationMinutes * 60_000;

  return {
    durationMs,
    elapsedMs: 0,
    remainingMs: durationMs,
    isPaused: false,
    hasWarnedOneMinute: false,
    hasExpired: false,
  };
}

export function advancePracticeCountdown(
  countdown: PracticeCountdown,
  elapsedMs: number,
): PracticeCountdownAdvanceResult {
  if (elapsedMs < 0) {
    throw new Error("Countdown cannot advance by a negative duration.");
  }

  if (countdown.isPaused || countdown.hasExpired) {
    return { countdown, shouldWarnOneMinute: false, shouldExpire: false };
  }

  const nextElapsedMs = Math.min(countdown.durationMs, countdown.elapsedMs + elapsedMs);
  const remainingMs = Math.max(0, countdown.durationMs - nextElapsedMs);
  const hasExpired = remainingMs === 0;
  const shouldWarnOneMinute = !countdown.hasWarnedOneMinute && remainingMs <= oneMinuteMs && !hasExpired;

  return {
    countdown: {
      ...countdown,
      elapsedMs: nextElapsedMs,
      remainingMs,
      hasWarnedOneMinute: countdown.hasWarnedOneMinute || shouldWarnOneMinute,
      hasExpired,
    },
    shouldWarnOneMinute,
    shouldExpire: hasExpired,
  };
}

export function pausePracticeCountdown(countdown: PracticeCountdown): PracticeCountdown {
  return countdown.hasExpired ? countdown : { ...countdown, isPaused: true };
}

export function resumePracticeCountdown(countdown: PracticeCountdown): PracticeCountdown {
  return countdown.hasExpired ? countdown : { ...countdown, isPaused: false };
}

export function formatPracticeCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
