import { describe, expect, it } from "vitest";

import { routeAfterAnalysis, routeAfterPracticeEnd, routes, safeRouteForPracticeStatus } from "./navigation";

describe("navigation decisions", () => {
  it("maps MVP routes to stable paths", () => {
    expect(routes.home).toBe("/");
    expect(routes.practiceConfirmation).toBe("/practice-confirm");
    expect(routes.adminExperiments).toBe("/admin/experiments");
  });

  it("always routes every practice end reason to self review", () => {
    expect(routeAfterPracticeEnd("user_completed")).toBe(routes.selfReview);
    expect(routeAfterPracticeEnd("emergency_end")).toBe(routes.selfReview);
    expect(routeAfterPracticeEnd("provider_failure")).toBe(routes.selfReview);
  });

  it("keeps results reachable when analysis fails", () => {
    expect(routeAfterAnalysis("success")).toBe(routes.results);
    expect(routeAfterAnalysis("failed")).toBe(routes.results);
  });

  it("uses safe fallbacks for invalid direct practice access", () => {
    expect(safeRouteForPracticeStatus(null)).toBe(routes.setup);
    expect(safeRouteForPracticeStatus("setup")).toBe(routes.setup);
    expect(safeRouteForPracticeStatus("active")).toBe(routes.practice);
  });
});
