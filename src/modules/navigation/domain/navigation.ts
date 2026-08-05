import type { PracticeEndReason, PracticeStatus } from "@/modules/practice-session/domain/practice-session";

export const routes = {
  home: "/",
  setup: "/setup",
  practiceConfirmation: "/practice-confirm",
  deviceCheck: "/device-check",
  practice: "/practice",
  selfReview: "/self-review",
  analysis: "/analysis",
  results: "/results",
  review: "/review",
  partialRetry: "/partial-retry",
  history: "/history",
  recordings: "/recordings",
  recovery: "/recovery",
  adminExperiments: "/admin/experiments",
} as const;

export function routeAfterPracticeEnd(_reason: PracticeEndReason): string {
  return routes.selfReview;
}

export function routeAfterAnalysis(_status: "success" | "failed"): string {
  return routes.results;
}

export function safeRouteForPracticeStatus(status: PracticeStatus | null): string {
  if (status === "active" || status === "paused") return routes.practice;
  if (status === "post_review" || status === "recoverable") return routes.selfReview;
  return routes.setup;
}
