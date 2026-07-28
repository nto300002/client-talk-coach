import { expect, test } from "@playwright/test";

test("shows enabled technical MVP scenarios and hides disabled fixtures", async ({ page }) => {
  await page.goto("/setup");

  await expect(page.getByRole("heading", { name: "練習を設定する" })).toBeVisible();
  await expect(page.getByText("初回要件ヒアリング")).toBeVisible();
  await expect(page.getByText("仕様変更・追加要望")).toBeVisible();
  await expect(page.getByText("納期遅延の説明")).toBeVisible();
  await expect(page.getByText("Disabled Fixture Scenario")).toHaveCount(0);
});

test("completes practice setup and reaches device check", async ({ page }) => {
  await page.goto("/setup");

  await page.getByRole("radio", { name: /初回要件ヒアリング/ }).check();
  await page.getByRole("radio", { name: /福祉事業所の初回相談/ }).check();
  await page.getByRole("radio", { name: /初級/ }).check();
  await page.getByRole("radio", { name: /IT知識が少ない顧客/ }).check();
  await page.getByRole("radio", { name: "質問を行う" }).check();
  await page.getByLabel("練習前の緊張度").fill("4");
  await page.getByLabel("練習前の自信度").fill("6");

  const startButton = page.getByRole("button", { name: "デバイス確認へ進む" });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  await expect(page).toHaveURL(/\/device-check$/);
  await expect(page.getByRole("heading", { name: "カメラとマイクを確認する" })).toBeVisible();
  await expect(page.getByText("7分の練習を開始する前に")).toBeVisible();
});
