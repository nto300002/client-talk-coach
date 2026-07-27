import { expect, test } from "@playwright/test";

test("renders the local environment test app in mock provider mode", async ({ page }) => {
  await page.goto("/test-app");

  await expect(page.getByRole("heading", { name: "Test app is running" })).toBeVisible();
  await expect(page.getByLabel("provider status")).toContainText("Provider mode: mock");
  await expect(page.getByText("No external API key is used.")).toBeVisible();
});
