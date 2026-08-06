# Issue #38: 実マイク入力によるデバイス準備確認

## 目的

デバイス確認で固定値を使わず、許可されたマイク入力から短時間の基準音量を取得する。計測は端末内で完結し、準備確認のために生音声や音声フレームを保存しない。

## 振る舞い

- カメラとマイクを許可した後、500msだけ `AudioContext` の解析器でRMSを計測する。
- 平均RMSを `MediaPreview.microphoneLevel` として返す。
- 音量が基準未満なら、練習を止めず「入力を確認してください」と警告する。
- カメラ、マイク、録画、保存容量のいずれかが使えなければ、開始を止めて安全な説明文を表示する。
- ブラウザが音声解析を提供しない場合は、録画自体を妨げず、音量0として警告を表示する。
- 一時的な解析器、音声ソース、AudioContextは測定後に必ず解放する。

## 受け入れ要件

- 固定値ではなくブラウザのマイク入力から基準音量を計算する。
- 準備画面で ready、warning、blocked を区別して表示する。
- 準備確認だけを目的に、音声サンプルや生データを保存しない。
- 音声解析不能時にも安全な警告状態として扱い、技術的な例外文字列を表示しない。

## TDDテスト要件

- Unit: 複数RMSフレームの平均値を返し、完了時に解析器を停止する。
- Unit: 音声解析開始に失敗した場合は0を返す。
- Unit: `BrowserMediaFacade.requestPreview` が非同期計測値を待機してプレビューへ格納する。
- E2E: 偽メディア環境でデバイス確認から録画開始まで到達できる。

## 実施結果

- 実測値を返す `BrowserMicrophoneLevelMeter` を追加した。
- `BrowserMediaFacade` の音量取得を非同期ポートに変更し、固定値を廃止した。
- `npm test -- --run src/modules/media/infrastructure/browser-media-facade.test.ts src/modules/media/infrastructure/browser-microphone-level-meter.test.ts` が成功した。
- `npm run lint` が成功した。
- `npx playwright test e2e/scenario-selection.spec.ts` が15件成功した。
