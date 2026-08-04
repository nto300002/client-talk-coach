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

  await page.getByRole("button", { name: "有効な定義を保存" }).click();
  await expect(page.getByRole("status")).toContainText("保存しました: v1");
  await page.getByRole("button", { name: "固定フィクスチャで比較" }).click();
  await expect(page.getByRole("heading", { name: "比較結果" })).toBeVisible();
  await expect(page.getByText("簡潔な顧客")).toBeVisible();
  await expect(page.getByText("確認重視の顧客")).toBeVisible();
});
