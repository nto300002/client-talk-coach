import { expect, test } from "@playwright/test";

test("edits a developer scenario and compares prompt versions without reading practice data", async ({ page }) => {
  await page.goto("/setup");
  await page.evaluate(() => {
    window.sessionStorage.setItem("client-talk-coach.practice-session", JSON.stringify({ id: "normal-practice-session" }));
    window.sessionStorage.setItem("client-talk-coach.self-reviews", JSON.stringify({ "normal-practice-session": { reflection: "private" } }));
  });

  await page.goto("/admin/experiments");

  await expect(page.getByRole("heading", { name: "管理者用実験モード" })).toBeVisible();
  await expect(page.getByText("通常の練習履歴、録画、自己評価は読み込みません。開発者が作成した固定フィクスチャだけを使います。")).toBeVisible();
  await expect(page.getByText("private", { exact: false })).toHaveCount(0);

  const scenarioJson = page.getByLabel("Scenario JSON");
  const updatedScenario = JSON.parse(await scenarioJson.inputValue());
  updatedScenario.shortDescription = "E2Eで更新したシナリオ";
  await scenarioJson.fill(JSON.stringify(updatedScenario, null, 2));
  await page.getByRole("button", { name: "有効な定義を保存" }).click();
  await expect(page.getByRole("status")).toContainText("保存しました: v1");
  await expect(page.getByRole("heading", { name: "保存済みバージョン" })).toBeVisible();
  await expect(page.locator("li", { hasText: "v1: E2Eで更新したシナリオ" })).toBeVisible();

  updatedScenario.shortDescription = "E2Eで再更新したシナリオ";
  await scenarioJson.fill(JSON.stringify(updatedScenario, null, 2));
  await page.getByRole("button", { name: "有効な定義を保存" }).click();
  await expect(page.getByRole("status")).toContainText("保存しました: v2");
  await expect(page.locator("li", { hasText: "v1: E2Eで更新したシナリオ" })).toBeVisible();
  await expect(page.locator("li", { hasText: "v2: E2Eで再更新したシナリオ" })).toBeVisible();

  await page.getByLabel("会話モデル設定").selectOption("mock-strict");
  await page.getByRole("button", { name: "固定フィクスチャで比較" }).click();
  await expect(page.getByRole("heading", { name: "比較結果" })).toBeVisible();
  await expect(page.getByText("簡潔な顧客")).toBeVisible();
  await expect(page.getByText("確認重視の顧客")).toBeVisible();
  await expect(page.getByText(/厳格判定の未確認項目/)).toHaveCount(2);
});
