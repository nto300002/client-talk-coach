// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaveSelfReview } from "@/modules/self-review/application/save-self-review";
import { SelfReviewForm } from "./self-review-form";

afterEach(() => cleanup());

describe("SelfReviewForm", () => {
  it("requires valid post-practice scores and saves the completed review", async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    const service = new SaveSelfReview({ save, findBySessionId: vi.fn() }, () => "2026-07-29T00:00:00.000Z");
    const onSaved = vi.fn();
    render(<SelfReviewForm sessionId="session-1" tensionBefore={7} confidenceBefore={3} saveSelfReview={service} onSaved={onSaved} />);
    const submit = screen.getByRole("button", { name: "自己評価を保存する" });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText("練習後の緊張度"), "11");
    await user.type(screen.getByLabelText("練習後の自信度"), "6");
    expect(submit).toBeDisabled();
    await user.clear(screen.getByLabelText("練習後の緊張度"));
    await user.type(screen.getByLabelText("練習後の緊張度"), "4");
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "session-1", tensionDifference: -3, confidenceDifference: 3 }));
    expect(onSaved).toHaveBeenCalled();
  });
});
