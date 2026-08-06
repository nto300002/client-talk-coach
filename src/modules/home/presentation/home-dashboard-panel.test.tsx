// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeDashboardPanel } from "@/modules/home/presentation/home-dashboard-panel";

describe("HomeDashboardPanel", () => {
  it("shows the main action, local recording count, and a recovery link when recovery exists", () => {
    render(
      <HomeDashboardPanel dashboard={{
        latestPractice: { scenarioId: "initial-requirements-interview", difficultyLevel: 2, tensionBefore: 7, tensionAfter: 5 },
        recordingCount: 12,
        hasRecovery: true,
      }} />,
    );

    expect(screen.getByRole("link", { name: "新しい練習を始める" })).toBeVisible();
    expect(screen.getByText("録画保存数 12 / 20")).toBeVisible();
    expect(screen.getByRole("link", { name: "中断データを確認" })).toBeVisible();
  });
});
