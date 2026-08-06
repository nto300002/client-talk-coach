import { expect, test, type Page } from "@playwright/test";

test("shows the home dashboard primary action and local storage summary", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "顧客折衝練習" })).toBeVisible();
  await expect(page.getByRole("link", { name: "新しい練習を始める" })).toBeVisible();
  await expect(page.getByText("録画保存数 0 / 20")).toBeVisible();
  await expect(page.getByText("前回の練習はありません。")).toBeVisible();
  expect(await page.locator("body").evaluate((element) => element.scrollWidth <= window.innerWidth)).toBe(true);
});

test("shows enabled technical MVP scenarios and hides disabled fixtures", async ({ page }) => {
  await page.goto("/setup");

  await expect(page.getByRole("heading", { name: "練習を設定する" })).toBeVisible();
  for (const scenarioName of [
    "初回要件ヒアリング",
    "曖昧な要望の具体化",
    "提案・見積もり説明",
    "仕様確認・認識合わせ",
    "仕様変更・追加要望",
    "進捗報告",
    "納期遅延の説明",
    "障害・不具合対応",
    "クレーム対応",
    "納品・検収・保守",
    "会議運営",
  ]) {
    await expect(page.getByText(scenarioName)).toBeVisible();
  }
  await expect(page.getByText("Disabled Fixture Scenario")).toHaveCount(0);
});

test("does not show errors for untouched dependent setup fields", async ({ page }) => {
  await page.goto("/setup");
  await page.getByRole("radio", { name: /初回要件ヒアリング/ }).check();

  await expect(page.locator(".field-error")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "デバイス確認へ進む" })).toBeDisabled();
});

test("shows only compatible expanded client types and focus skills after selecting a scene", async ({ page }) => {
  await page.goto("/setup");
  await page.getByRole("radio", { name: /仕様変更・追加要望/ }).check();
  await page.getByRole("radio", { name: /開発後半のCSV出力追加/ }).check();

  await expect(page.getByRole("radio", { name: /要望を頻繁に変更する顧客/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /反論が多い顧客/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /IT知識が少ない顧客/ })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "断り方を練習する" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "その場で即答しない" })).toBeVisible();
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

  await expect(page).toHaveURL(/\/practice-confirm$/);
  await expect(page.getByText("初回要件ヒアリング", { exact: true })).toBeVisible();
  await expect(page.getByText("福祉事業所の初回相談", { exact: true })).toBeVisible();
  await expect(page.getByText("IT知識が少ない顧客", { exact: true })).toBeVisible();
  await expect(page.getByText("質問を行う", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "デバイス確認へ進む" }).click();
  await expect(page).toHaveURL(/\/device-check$/);
  await expect(page.getByRole("heading", { name: "カメラとマイクを確認する" })).toBeVisible();
  await expect(page.getByText("7分の練習を開始する前に")).toBeVisible();
});

test("warns one minute before time expiry and ends the practice once the selected duration elapses", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-08-06T12:00:00.000Z") });
  await installBrowserMediaMocks(page);
  await startPracticeWithDuration(page, "5分");

  await expect(page.getByTestId("remaining-time")).toHaveText("5:00");
  await page.clock.fastForward(240_000);
  await expect(page.getByTestId("remaining-time")).toHaveText("1:00");
  await expect(page.getByRole("alert")).toHaveText("終了まで残り1分です。会話をまとめてください。");

  await page.clock.fastForward(60_000);
  await expect(page).toHaveURL(/\/self-review$/);
  await expect(page.getByText("終了理由: 時間終了")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const session = JSON.parse(window.sessionStorage.getItem("client-talk-coach.practice-session") ?? "{}");
    return session.endReason;
  })).toBe("time_expired");
});

test("runs the practice lifecycle through pause, resume, and post-practice self review", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-08-06T12:00:00.000Z") });
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
  await expect(page).toHaveURL(/\/practice-confirm$/);
  await page.getByRole("button", { name: "デバイス確認へ進む" }).click();

  await page.getByRole("button", { name: "カメラとマイクを許可する" }).click();
  await expect(page.getByText("カメラ: 準備完了")).toBeVisible();
  await expect(page.getByText("保存容量: 録画可能")).toBeVisible();
  await expect(page.getByText("録画数: 0 / 20")).toBeVisible();
  await expect(page.getByLabel("カメラプレビュー")).toBeVisible();
  await page.getByRole("button", { name: "録画して練習を開始する" }).click();
  await expect(page.getByRole("heading", { name: "AI顧客との練習" })).toBeVisible();
  await expect(page.getByText("録画中です")).toBeVisible();
  await page.getByRole("button", { name: "マイクで発話する" }).click();
  await page.getByRole("button", { name: "発話を終了して文字起こしする" }).click();
  await expect(page.getByText("テスト発話を受け取りました")).toBeVisible();

  await page.getByRole("button", { name: "一時停止する" }).click();
  await expect(page.getByText("一時停止中")).toBeVisible();
  await page.getByRole("button", { name: "再開する" }).click();
  await expect(page.getByText("録画中です")).toBeVisible();

  await page.getByRole("button", { name: "会話を終了する" }).click();
  await expect(page.getByRole("dialog")).toContainText("会話を終了しますか");
  await page.getByRole("button", { name: "会話へ戻る" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "会話を終了する" }).click();
  await page.getByRole("button", { name: "終了して自己評価へ進む" }).click();
  await expect(page).toHaveURL(/\/self-review$/);
  await expect(page.getByRole("heading", { name: "練習後の自己評価" })).toBeVisible();
  await expect(page.getByRole("link", { name: "結果を見る" })).toHaveCount(0);
  await page.getByLabel("練習後の緊張度").fill("3");
  await page.getByLabel("練習後の自信度").fill("7");
  await page.getByRole("checkbox", { name: "最後まで話せた" }).check();
  await page.getByRole("button", { name: "自己評価を保存する" }).click();
  await expect(page.getByText("自己評価を保存しました。")).toBeVisible();
  await page.getByRole("link", { name: "分析を確認する" }).click();
  await expect(page.getByRole("heading", { name: "練習結果" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "今回できたこと" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "次に練習すること" })).toBeVisible();
  await expect(page.getByTestId("primary-feedback")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "今回できたこと" })).toHaveJSProperty("tagName", "H2");
  await expect(page.getByRole("heading", { name: "再練習" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "取得できた事項" })).toBeVisible();
  await expect(page.getByText("現行Excel管理", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "未確認の重要事項" })).toBeVisible();
  await expect(page.getByText("個人情報", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "録画を振り返る" }).click();
  await expect(page.getByRole("heading", { name: "録画を振り返る" })).toBeVisible();
  await expect(page.getByRole("button", { name: "60秒の再練習を開始する" })).toBeVisible();
  await page.getByRole("button", { name: "60秒の再練習を開始する" }).click();
  await page.getByLabel("再練習の回答").fill("結論からお伝えします。個人情報の扱いを確認します。");
  await expect(page.getByRole("status")).toContainText("残り 60秒。時間終了後に保存できます。");
  await expect(page.getByRole("button", { name: "再練習を保存する" })).toBeDisabled();
  await page.clock.fastForward(60_000);
  await expect(page.getByRole("status")).toContainText("再練習が終わりました。回答を保存できます。");
  await page.getByRole("button", { name: "再練習を保存する" }).click();
  await expect(page.getByRole("status")).toContainText("部分再練習を保存しました。元の回答");

  await page.goto("/history");
  await expect(page.getByRole("heading", { name: "練習履歴" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "initial-requirements-interview" })).toBeVisible();
  await expect(page.getByText("この条件では初回の練習です")).toBeVisible();
  await expect(page.getByText("分析: 保存あり")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "録画のみ削除" }).click();
  await expect(page.getByText("録画: なし（手動で削除しました）")).toBeVisible();
  await expect(page.getByText("分析: 保存あり")).toBeVisible();
  await expect(page.getByRole("button", { name: "録画のみ削除" })).toHaveCount(0);
  await page.goto("/results");
  await expect(page.getByRole("heading", { name: "練習結果" })).toBeVisible();
});

test("compares matching sessions and confirms session and all-data deletion", async ({ page }) => {
  await installBrowserMediaMocks(page);

  await completePractice(page);
  await page.goto("/history");
  await expect(page.getByText("この条件では初回の練習です")).toBeVisible();

  await completePractice(page);
  await page.goto("/history");
  await expect(page.locator(".history-entry")).toHaveCount(2);
  await expect(page.getByText(/前回比較:/)).toHaveCount(1);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "練習履歴を削除" }).first().click();
  await expect(page.locator(".history-entry")).toHaveCount(1);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "すべての端末内データを削除" }).click();
  await expect(page.getByText("まだ練習履歴はありません。")).toBeVisible();
  await expect(page.locator(".history-entry")).toHaveCount(0);
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
  await expect(page).toHaveURL(/\/practice-confirm$/);
  await page.getByRole("button", { name: "デバイス確認へ進む" }).click();
  await page.getByRole("button", { name: "カメラとマイクを許可する" }).click();
  await page.getByRole("button", { name: "録画して練習を開始する" }).click();

  await expect(page.getByText("氏名、住所、支援記録などの個人情報を扱う。", { exact: false })).toHaveCount(0);
  await page.getByLabel("顧客への発話（テスト入力）").fill("個人情報を扱いますか？");
  await page.getByRole("button", { name: "発話を送る" }).click();
  await expect(page.getByText("氏名、住所、支援記録などの個人情報を扱う。", { exact: false })).toBeVisible();
  await expect(page.getByText("開示済み要件: 現行Excel管理、個人情報")).toBeVisible();
});

test("retries failed AI and STT requests, then can safely end the practice", async ({ page }) => {
  await installBrowserMediaMocks(page);
  await startPractice(page);

  await page.evaluate(() => { (window as Window & { e2eAiFailuresRemaining: number }).e2eAiFailuresRemaining = 2; });
  await page.getByLabel("顧客への発話（テスト入力）").fill("現在の業務について教えてください。");
  await page.getByRole("button", { name: "発話を送る" }).click();
  await expect(page.getByText("AI顧客の応答を取得できませんでした。もう一度お試しください。")).toBeVisible();
  await expect(page.getByRole("button", { name: "AI応答を再試行" })).toBeVisible();
  await page.getByRole("button", { name: "AI応答を再試行" }).click();
  await expect(page.getByText("承知しました。続けて教えてください。")).toBeVisible();

  await page.evaluate(() => { (window as Window & { e2eSttFailuresRemaining: number }).e2eSttFailuresRemaining = 3; });
  await page.getByRole("button", { name: "マイクで発話する" }).click();
  await page.getByRole("button", { name: "発話を終了して文字起こしする" }).click();
  await expect(page.getByText("音声を文字に変換できませんでした。テキスト入力でも続けられます。")).toBeVisible();
  await expect(page.getByRole("button", { name: "文字起こしを再試行" })).toBeVisible();
  await page.getByRole("button", { name: "文字起こしを再試行" }).click();
  await expect(page.getByText("テスト発話を受け取りました")).toBeVisible();

  await page.getByRole("button", { name: "安全に終了する" }).click();
  await expect(page.getByRole("dialog")).toContainText("安全に練習を終了しますか");
  await expect(page.getByRole("dialog")).not.toContainText("失敗");
  await page.getByRole("dialog").getByRole("button", { name: "安全に終了する" }).click();
  await expect(page).toHaveURL(/\/self-review$/);
  await expect(page.getByText("終了理由: 安全終了")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const session = JSON.parse(window.sessionStorage.getItem("client-talk-coach.practice-session") ?? "{}");
    return session.preserveRecoverableData;
  })).toBe(true);
});

test("passes confirmed user speech into the local audio analysis", async ({ page }) => {
  await installBrowserMediaMocks(page);
  await startPractice(page);

  await page.getByLabel("顧客への発話（テスト入力）").fill("あの、利用人数を教えてください。");
  await page.getByRole("button", { name: "発話を送る" }).click();
  await expect(page.getByText("承知しました。続けて教えてください。")).toBeVisible();
  await page.getByRole("button", { name: "会話を終了する" }).click();
  await page.getByRole("button", { name: "終了して自己評価へ進む" }).click();
  await expect(page).toHaveURL(/\/self-review$/);

  await expect.poll(() => readLatestAudioAnalysis(page)).toEqual(expect.objectContaining({ fillerCount: 1 }));
});

async function installBrowserMediaMocks(page: Page) {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/v1/stt/transcriptions")) {
        const failureWindow = window as Window & { e2eSttFailuresRemaining?: number };
        if ((failureWindow.e2eSttFailuresRemaining ?? 0) > 0) {
          failureWindow.e2eSttFailuresRemaining! -= 1;
          return new Response("unavailable", { status: 503 });
        }
        return new Response(JSON.stringify({
          data: {
            utteranceId: "e2e-utterance",
            transcript: "テスト発話を受け取りました",
            confidence: 0.99,
            startedAtMs: 0,
            endedAtMs: 1,
            isEmpty: false,
          },
        }), { headers: { "content-type": "application/json" } });
      }
      if (url.includes("/api/v1/ai/client-responses")) {
        const failureWindow = window as Window & { e2eAiFailuresRemaining?: number };
        if ((failureWindow.e2eAiFailuresRemaining ?? 0) > 0) {
          failureWindow.e2eAiFailuresRemaining! -= 1;
          return new Response("unavailable", { status: 503 });
        }
        const body = typeof init?.body === "string" ? JSON.parse(init.body) as {
          scenarioContext?: { eligibleFacts?: Array<{ id: string; content: string }> };
        } : {};
        const facts = body.scenarioContext?.eligibleFacts ?? [];
        return new Response(JSON.stringify({
          data: {
            text: facts.length ? facts.map((fact) => fact.content).join(" ") : "承知しました。続けて教えてください。",
            disclosedFactIds: facts.map((fact) => fact.id),
          },
        }), { headers: { "content-type": "application/json" } });
      }
      return originalFetch(input, init);
    };

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
      private readonly mimeType: string;

      constructor(_stream: MediaStream, options?: { mimeType?: string }) {
        this.mimeType = options?.mimeType ?? "video/webm";
      }

      start() {
        this.state = "recording";
        this.ondataavailable?.({ data: new Blob(["recording"], { type: this.mimeType }) });
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

async function readLatestAudioAnalysis(page: Page) {
  return page.evaluate(async () => {
    const request = indexedDB.open("client-talk-coach");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction("analyses", "readonly");
    const records = await new Promise<Array<{ result?: { fillerCount?: number } }>>((resolve, reject) => {
      const getAll = transaction.objectStore("analyses").getAll();
      getAll.onsuccess = () => resolve(getAll.result);
      getAll.onerror = () => reject(getAll.error);
    });
    database.close();
    return records.at(-1)?.result ?? null;
  });
}

async function completePractice(page: Page) {
  await page.goto("/setup");
  await page.getByRole("radio", { name: /初回要件ヒアリング/ }).check();
  await page.getByRole("radio", { name: /福祉事業所の初回相談/ }).check();
  await page.getByRole("radio", { name: /初級/ }).check();
  await page.getByRole("radio", { name: /IT知識が少ない顧客/ }).check();
  await page.getByRole("radio", { name: "質問を行う" }).check();
  await page.getByLabel("練習前の緊張度").fill("4");
  await page.getByLabel("練習前の自信度").fill("6");
  await page.getByRole("button", { name: "デバイス確認へ進む" }).click();
  await expect(page).toHaveURL(/\/practice-confirm$/);
  await page.getByRole("button", { name: "デバイス確認へ進む" }).click();
  await page.getByRole("button", { name: "カメラとマイクを許可する" }).click();
  await page.getByRole("button", { name: "録画して練習を開始する" }).click();
  await page.getByRole("button", { name: "会話を終了する" }).click();
  await page.getByRole("button", { name: "終了して自己評価へ進む" }).click();
  await page.getByLabel("練習後の緊張度").fill("3");
  await page.getByLabel("練習後の自信度").fill("7");
  await page.getByRole("checkbox", { name: "最後まで話せた" }).check();
  await page.getByRole("button", { name: "自己評価を保存する" }).click();
}

async function startPractice(page: Page) {
  await page.goto("/setup");
  await page.getByRole("radio", { name: /初回要件ヒアリング/ }).check();
  await page.getByRole("radio", { name: /福祉事業所の初回相談/ }).check();
  await page.getByRole("radio", { name: /初級/ }).check();
  await page.getByRole("radio", { name: /IT知識が少ない顧客/ }).check();
  await page.getByRole("radio", { name: "質問を行う" }).check();
  await page.getByLabel("練習前の緊張度").fill("4");
  await page.getByLabel("練習前の自信度").fill("6");
  await page.getByRole("button", { name: "デバイス確認へ進む" }).click();
  await expect(page).toHaveURL(/\/practice-confirm$/);
  await page.getByRole("button", { name: "デバイス確認へ進む" }).click();
  await page.getByRole("button", { name: "カメラとマイクを許可する" }).click();
  await page.getByRole("button", { name: "録画して練習を開始する" }).click();
}

async function startPracticeWithDuration(page: Page, duration: "5分" | "7分" | "10分") {
  await page.goto("/setup");
  await page.getByRole("radio", { name: /初回要件ヒアリング/ }).check();
  await page.getByRole("radio", { name: /福祉事業所の初回相談/ }).check();
  await page.getByRole("radio", { name: /初級/ }).check();
  await page.getByRole("radio", { name: /IT知識が少ない顧客/ }).check();
  await page.getByRole("radio", { name: "質問を行う" }).check();
  await page.getByRole("radio", { name: duration }).check();
  await page.getByLabel("練習前の緊張度").fill("4");
  await page.getByLabel("練習前の自信度").fill("6");
  await page.getByRole("button", { name: "デバイス確認へ進む" }).click();
  await page.getByRole("button", { name: "デバイス確認へ進む" }).click();
  await page.getByRole("button", { name: "カメラとマイクを許可する" }).click();
  await page.getByRole("button", { name: "録画して練習を開始する" }).click();
}

test("keeps 20 recordings, deletes only the old video, and blocks all-favorite recording starts", async ({ page }) => {
  await page.goto("/recording-storage-test");

  await page.getByRole("button", { name: "20件の録画を作成" }).click();
  await expect(page.getByText("保存済み録画: 20 / 20")).toBeVisible();

  await page.getByRole("button", { name: "21本目を保存", exact: true }).click();
  await expect(page.getByText("保存済み録画: 20 / 20")).toBeVisible();
  await expect(page.getByText("recording-00: 保存上限により自動削除されました")).toBeVisible();
  await expect(page.getByText("recording-00 の分析結果は保持されています")).toBeVisible();

  await page.getByRole("button", { name: "20件をすべてお気に入りにする" }).click();
  await expect(page.getByRole("status")).toHaveText("20件をすべてお気に入りにしました");
  await page.getByRole("button", { name: "録画を開始する" }).click();
  await expect(page.getByText("お気に入りを解除または動画を削除してください")).toBeVisible();
});

test("keeps all existing recordings when the twenty-first recording save fails", async ({ page }) => {
  await page.goto("/recording-storage-test");

  await page.getByRole("button", { name: "20件の録画を作成" }).click();
  await expect(page.getByText("保存済み録画: 20 / 20")).toBeVisible();
  await page.getByRole("button", { name: "失敗する21本目を保存" }).click();

  await expect(page.getByRole("status")).toHaveText("21本目の保存に失敗しました。既存録画は保持されています");
  await expect(page.getByText("保存済み録画: 20 / 20")).toBeVisible();
  await expect(page.getByText(/保存上限により自動削除されました/)).toHaveCount(0);
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

test("routes from home to the normal, management, recovery, and admin entry points", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "顧客折衝練習" })).toBeVisible();
  await page.getByRole("link", { name: "新しい練習を始める" }).click();
  await expect(page).toHaveURL(/\/setup$/);

  await page.goto("/");
  await page.getByRole("link", { name: "録画管理" }).click();
  await expect(page.getByRole("heading", { name: "録画管理" })).toBeVisible();
  await page.getByRole("link", { name: "練習履歴を開く" }).click();
  await expect(page).toHaveURL(/\/history$/);

  await page.goto("/recovery");
  await expect(page.getByText("復旧が必要な中断データはありません。")).toBeVisible();
  await page.goto("/admin/experiments");
  await expect(page.getByRole("heading", { name: "管理者用実験モード" })).toBeVisible();
});

test("shows safe fallbacks for direct routes without prerequisite data", async ({ page }) => {
  await page.goto("/practice-confirm");
  await expect(page.getByRole("heading", { name: "練習設定が見つかりません" })).toBeVisible();
  await expect(page.getByRole("link", { name: "練習設定へ" })).toHaveAttribute("href", "/setup");

  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "練習設定が見つかりません" })).toBeVisible();
  await page.goto("/results");
  await expect(page.getByRole("heading", { name: "自己評価が必要です" })).toBeVisible();
});
