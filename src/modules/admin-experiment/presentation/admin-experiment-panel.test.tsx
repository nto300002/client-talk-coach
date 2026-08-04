// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { AdminExperimentPanel } from "./admin-experiment-panel";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";

afterEach(() => {
  cleanup();
});

const repository = {
  saveScenario: () => ({ version: 1 }),
  savePrompt: () => ({ id: "prompt", name: "prompt", instruction: "prompt", version: 1, savedAt: "now" }),
};

describe("AdminExperimentPanel", () => {
  it("shows validation errors and disables saving invalid JSON", async () => {
    render(<AdminExperimentPanel initialScenario={technicalMvpScenarioFixtures[0]} repository={repository} />);

    fireEvent.change(screen.getByLabelText("Scenario JSON"), { target: { value: "{" } });

    expect(screen.getByText("JSONの形式が正しくありません。")).toBeVisible();
    expect(screen.getByRole("button", { name: "有効な定義を保存" })).toBeDisabled();
  });

  it("saves a valid scenario and shows separate prompt comparison results", async () => {
    const user = userEvent.setup();
    render(<AdminExperimentPanel initialScenario={technicalMvpScenarioFixtures[0]} repository={repository} />);

    await user.click(screen.getByRole("button", { name: "有効な定義を保存" }));
    expect(screen.getByRole("status")).toHaveTextContent("保存しました: v1。過去の版は端末内に保持されています。");
    await user.click(screen.getByRole("button", { name: "固定フィクスチャで比較" }));
    expect(screen.getByText("簡潔な顧客")).toBeVisible();
    expect(screen.getByText("確認重視の顧客")).toBeVisible();
  });
});
