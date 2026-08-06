export type HomeDashboardSession = {
  id: string;
  scenarioId: string;
  difficultyLevel: number;
};

export type HomeDashboardReview = {
  sessionId: string;
  tensionBefore: number;
  tensionAfter: number;
};

export type HomeDashboard = {
  latestPractice: {
    scenarioId: string;
    difficultyLevel: number;
    tensionBefore: number;
    tensionAfter: number;
  } | null;
  recordingCount: number;
  hasRecovery: boolean;
};

export function buildHomeDashboard(input: {
  sessions: readonly HomeDashboardSession[];
  reviews: readonly HomeDashboardReview[];
  recordingCount: number;
  hasRecovery: boolean;
}): HomeDashboard {
  const latestSession = input.sessions[0];
  const latestReview = latestSession
    ? input.reviews.find((review) => review.sessionId === latestSession.id)
    : undefined;

  return {
    latestPractice: latestSession && latestReview
      ? {
          scenarioId: latestSession.scenarioId,
          difficultyLevel: latestSession.difficultyLevel,
          tensionBefore: latestReview.tensionBefore,
          tensionAfter: latestReview.tensionAfter,
        }
      : null,
    recordingCount: Math.max(0, input.recordingCount),
    hasRecovery: input.hasRecovery,
  };
}
