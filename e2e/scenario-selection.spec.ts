import { expect, test } from "@playwright/test";

test("shows enabled technical MVP scenarios and hides disabled fixtures", async ({ page }) => {
  await page.goto("/setup");

  await expect(page.getByRole("heading", { name: "練習シチュエーションを選択" })).toBeVisible();
  await expect(page.getByText("初回要件ヒアリング")).toBeVisible();
  await expect(page.getByText("仕様変更・追加要望")).toBeVisible();
  await expect(page.getByText("納期遅延の説明")).toBeVisible();
  await expect(page.getByText("Disabled Fixture Scenario")).toHaveCount(0);
});
