// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { PracticeSetupForm } from "@/modules/practice-setup/presentation/practice-setup-form";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";

afterEach(() => cleanup());

describe("PracticeSetupForm", () => {
  it("updates the selected visual state and clears a dependent scene when the situation changes", async () => {
    const user = userEvent.setup();
    render(<PracticeSetupForm scenarios={technicalMvpScenarioFixtures.filter((scenario) => scenario.status === "enabled")} />);

    await user.click(screen.getByRole("radio", { name: /初回要件ヒアリング/ }));
    await user.click(screen.getByRole("radio", { name: /福祉事業所の初回相談/ }));

    expect(screen.getByRole("radio", { name: /福祉事業所の初回相談/ })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: /仕様変更・追加要望/ }));

    expect(screen.queryByRole("radio", { name: /福祉事業所の初回相談/ })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /開発後半のCSV出力追加/ })).not.toBeChecked();
  });

  it("shows validation messages and enables start only after the setup is complete", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <PracticeSetupForm
        scenarios={technicalMvpScenarioFixtures.filter((scenario) => scenario.status === "enabled")}
        onStart={onStart}
      />,
    );

    const startButton = screen.getByRole("button", { name: "デバイス確認へ進む" });
    expect(startButton).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: /初回要件ヒアリング/ }));
    await user.click(screen.getByRole("radio", { name: /福祉事業所の初回相談/ }));
    await user.click(screen.getByRole("radio", { name: /初級/ }));
    await user.click(screen.getByRole("radio", { name: /IT知識が少ない顧客/ }));
    await user.click(screen.getByRole("radio", { name: /質問を行う/ }));
    await user.type(screen.getByLabelText("練習前の緊張度"), "11");
    await user.type(screen.getByLabelText("練習前の自信度"), "6");

    expect(screen.getByLabelText("練習前の緊張度")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getAllByText("0から10の整数で入力してください。")).toHaveLength(1);
    expect(startButton).toBeDisabled();
    expect(onStart).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("練習前の緊張度"));
    await user.type(screen.getByLabelText("練習前の緊張度"), "4");

    expect(startButton).toBeEnabled();
    await user.click(startButton);

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        scenarioId: "initial-requirements-interview",
        sceneId: "welfare-office-first-call",
        difficultyLevel: 2,
        clientTypeId: "low-it-knowledge-client",
        focusSkillId: "ask-questions",
        durationMinutes: 7,
        tensionBefore: 4,
        confidenceBefore: 6,
      }),
    );
  });
});
