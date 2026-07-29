import { expect, test, type Page } from "@playwright/test";

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

test("runs the practice lifecycle through pause, resume, and post-practice self review", async ({ page }) => {
  await installBrowserMediaMocks(page);
  await page.goto("/setup");

  await page.getByRole("radio", { name: /初回要件ヒアリング/ }).check();
  await page.getByRole("radio", { name: /福祉事業所の初回相談/ }).check();
  await page.getByRole("radio", { name: /初級/ }).check();
  await page.getByRole("radio", { name: /IT知識が少ない顧客/ }).check();
  await page.getByRole("radio", { name: "質問を行う" }).check();
  await page.getByLabel("練習前の緊張度").fill("4");
  await page.getByLabel("練習前の自信度").fill("6");
  await page.getByRole("button", { name: "デバイス確認へ進む" }).click();

  await page.getByRole("button", { name: "カメラとマイクを許可する" }).click();
  await expect(page.getByText("カメラ: 準備完了")).toBeVisible();
  await expect(page.getByLabel("カメラプレビュー")).toBeVisible();
  await page.getByRole("button", { name: "録画して練習を開始する" }).click();
  await expect(page.getByRole("heading", { name: "AI顧客との練習" })).toBeVisible();
  await expect(page.getByText("録画中です")).toBeVisible();

  await page.getByRole("button", { name: "一時停止する" }).click();
  await expect(page.getByText("一時停止中")).toBeVisible();
  await page.getByRole("button", { name: "再開する" }).click();
  await expect(page.getByText("録画中です")).toBeVisible();

  await page.getByRole("button", { name: "会話を終了する" }).click();
  await expect(page).toHaveURL(/\/self-review$/);
  await expect(page.getByRole("heading", { name: "練習後の自己評価" })).toBeVisible();
});

test("discloses an eligible client fact only after the matching question", async ({ page }) => {
  await installBrowserMediaMocks(page);
  await page.goto("/setup");
  await page.getByRole("radio", { name: /初回要件ヒアリング/ }).check();
  await page.getByRole("radio", { name: /福祉事業所の初回相談/ }).check();
  await page.getByRole("radio", { name: /初級/ }).check();
  await page.getByRole("radio", { name: /IT知識が少ない顧客/ }).check();
  await page.getByRole("radio", { name: "質問を行う" }).check();
  await page.getByLabel("練習前の緊張度").fill("4");
  await page.getByLabel("練習前の自信度").fill("6");
  await page.getByRole("button", { name: "デバイス確認へ進む" }).click();
  await page.getByRole("button", { name: "カメラとマイクを許可する" }).click();
  await page.getByRole("button", { name: "録画して練習を開始する" }).click();

  await expect(page.getByText("氏名、住所、支援記録などの個人情報を扱う。", { exact: false })).toHaveCount(0);
  await page.getByLabel("顧客への発話（テスト入力）").fill("個人情報を扱いますか？");
  await page.getByRole("button", { name: "発話を送る" }).click();
  await expect(page.getByText("氏名、住所、支援記録などの個人情報を扱う。", { exact: false })).toBeVisible();
  await expect(page.getByText("開示済み要件: 現行Excel管理、個人情報")).toBeVisible();
});

async function installBrowserMediaMocks(page: Page) {
  await page.addInitScript(() => {
    const stream = new MediaStream();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: async () => stream },
    });

    class FakeMediaRecorder {
      static isTypeSupported() {
        return true;
      }

      state: "inactive" | "recording" | "paused" = "inactive";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: ((event: { error: Error }) => void) | null = null;

      start() {
        this.state = "recording";
        this.ondataavailable?.({ data: new Blob(["recording"], { type: "video/webm" }) });
      }

      pause() {
        this.state = "paused";
      }

      resume() {
        this.state = "recording";
      }

      stop() {
        this.state = "inactive";
        this.onstop?.();
      }
    }

    Object.defineProperty(window, "MediaRecorder", { configurable: true, value: FakeMediaRecorder });
    HTMLMediaElement.prototype.play = () => Promise.resolve();
  });
}

test("keeps 20 recordings, deletes only the old video, and blocks all-favorite recording starts", async ({ page }) => {
  await page.goto("/recording-storage-test");

  await page.getByRole("button", { name: "20件の録画を作成" }).click();
  await expect(page.getByText("保存済み録画: 20 / 20")).toBeVisible();

  await page.getByRole("button", { name: "21本目を保存" }).click();
  await expect(page.getByText("保存済み録画: 20 / 20")).toBeVisible();
  await expect(page.getByText("recording-00: 保存上限により自動削除されました")).toBeVisible();
  await expect(page.getByText("recording-00 の分析結果は保持されています")).toBeVisible();

  await page.getByRole("button", { name: "20件をすべてお気に入りにする" }).click();
  await page.getByRole("button", { name: "録画を開始する" }).click();
  await expect(page.getByText("お気に入りを解除または動画を削除してください")).toBeVisible();
});

test("shows timestamped audio markers from a mocked fixture analysis", async ({ page }) => {
  await page.goto("/audio-analysis-test");

  await page.getByRole("button", { name: "フィクスチャ音声を分析する" }).click();

  await expect(page.getByRole("heading", { name: "音声分析マーカー" })).toBeVisible();
  await expect(page.getByText(/low_volume: 0ms/)).toBeVisible();
  await expect(page.getByText(/long_silence: 500ms/)).toBeVisible();
  await expect(page.getByText(/filler: 0ms/)).toBeVisible();
});

test("shows a mock STT transcript for a fixture utterance", async ({ page }) => {
  await page.goto("/transcription-test");

  await page.getByRole("button", { name: "フィクスチャ発話を文字起こしする" }).click();
  await expect(page.getByText("文字起こし: テスト発話を受け取りました")).toBeVisible();
});
