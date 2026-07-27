# 受託開発向けAI顧客折衝トレーニングアプリ

## 画面詳細設計

# 6. 画面詳細設計

# SCR-001 ホーム

## 目的

新規練習、履歴、録画管理、中断データ復旧への入口を提供する。

## 表示情報

* 前回の練習条件
* 前回の緊張度・自信度変化
* 保存録画数
* 中断データ件数
* 最終練習日時

## ボタン・処理

| UI        | 処理                                               |
| --------- | ------------------------------------------------ |
| 新しい練習を始める | `CreatePracticeConfigurationUseCase`を実行しSCR-002へ |
| 練習履歴      | `ListPracticeHistoryUseCase`を実行しSCR-016へ         |
| 録画管理      | `ListRecordingsUseCase`を実行しSCR-018へ              |
| 中断データを確認  | `ListRecoverableSessionsUseCase`を実行しSCR-019へ     |
| 実験モード     | Feature Flag有効時のみSCR-101へ                        |

## API

HTTP APIなし。

## 受け入れ条件

* 録画本数が正しく表示される
* 中断データがない場合、復旧導線を表示しない
* 最新履歴がない場合は初回用表示になる

---

# SCR-002 シチュエーション選択

## 目的

11種類の業務シチュエーションから一つを選択する。

## 初期処理

```text
ListEnabledScenariosUseCase
→ ScenarioRepository.listEnabled()
```

## ボタン・処理

| UI          | 処理                       |
| ----------- | ------------------------ |
| シチュエーションカード | `SelectSituationUseCase` |
| 次へ          | 選択済みの場合SCR-003へ          |
| 戻る          | SCR-001へ                 |

## API

HTTP APIなし。

## 状態

```typescript
type SituationSelectionState = {
  scenarios: ScenarioSummary[];
  selectedScenarioId: string | null;
  canProceed: boolean;
};
```

## エラー

シナリオ定義読込失敗時は「シナリオを読み込めませんでした」を表示し、再読込を可能にする。

---

# SCR-003 具体的場面選択

## 目的

選択したシチュエーションに含まれる具体的場面を一つ選ぶ。

## 初期処理

```text
ListCompatibleScenesUseCase
```

## ボタン・処理

| UI          | 処理                           |
| ----------- | ---------------------------- |
| 場面カード       | `SelectConcreteSceneUseCase` |
| 次へ          | SCR-004へ                     |
| シチュエーションを変更 | SCR-002へ戻り、Scene選択を解除        |
| 戻る          | SCR-002へ                     |

## API

HTTP APIなし。

## 表示

* 場面名
* 概要
* 練習目標
* 対応難易度
* 対応顧客タイプ

---

# SCR-004 練習条件設定

## 目的

難易度、顧客タイプ、重点技能、時間を選択する。

## 初期処理

```text
BuildPracticeOptionUseCase
DifficultyRecommendationPolicy
ScenarioCompatibilityPolicy
```

## ボタン・処理

| UI      | 処理                              |
| ------- | ------------------------------- |
| 難易度ボタン  | `SelectDifficultyUseCase`       |
| 顧客タイプ   | `SelectClientTypeUseCase`       |
| 重点技能    | `SelectFocusSkillUseCase`       |
| アプリに任せる | `RecommendFocusSkillUseCase`    |
| 時間      | `SelectPracticeDurationUseCase` |
| 次へ      | SCR-005へ                        |
| 戻る      | SCR-003へ                        |

## API

HTTP APIなし。

## 検証

* 5・7・10分以外を拒否
* 非互換の顧客タイプを選択不可
* 非対応難易度を選択不可

---

# SCR-005 練習前自己評価

## 目的

練習前の緊張度と自信度を記録する。

## 入力

* 緊張度：0〜10の整数
* 自信度：0〜10の整数

## ボタン・処理

| UI | 処理                                         |
| -- | ------------------------------------------ |
| 次へ | `SavePrePracticeReviewUseCase`を実行しSCR-006へ |
| 戻る | SCR-004へ                                   |

## API

HTTP APIなし。

## 保存先

```text
Local Repository
practiceSessions
selfReviews
```

---

# SCR-006 カメラ・マイク確認

## 目的

練習開始に必要なデバイス、音量、保存条件を確認する。

## 初期処理

```text
CheckPracticeReadinessUseCase
├─ MediaDevicePort.requestStream
├─ StorageQuotaPort.estimate
├─ RecordingRepository.countAvailableRecordings
└─ AudioAnalysisPort.calibrate
```

## ボタン・処理

| UI         | 処理                                 |
| ---------- | ---------------------------------- |
| カメラ・マイクを許可 | Browser API `getUserMedia`         |
| もう一度確認     | `CheckPracticeReadinessUseCase`再実行 |
| 練習確認へ      | すべて必須条件を満たした場合SCR-007へ             |
| 録画を整理      | 20本すべてがお気に入りの場合SCR-018へ            |
| 戻る         | MediaStreamを停止してSCR-005へ           |

## 開始をブロックする条件

* カメラ権限拒否
* マイク権限拒否
* マイク未検出
* 保存容量不足
* 20本すべてがお気に入り
* 対応MIMEが存在しない

## API

HTTP APIなし。

---

# SCR-007 練習確認

## 目的

練習開始前に選択内容とデータ送信範囲を確認する。

## 表示

* シチュエーション
* 具体的場面
* 難易度
* 顧客タイプ
* 重点技能
* 練習時間
* 動画の保存先
* 外部APIへ送信するデータ

## ボタン・処理

| UI    | 処理                     |
| ----- | ---------------------- |
| 練習を開始 | `StartPracticeUseCase` |
| 設定を変更 | SCR-002またはSCR-004へ     |
| キャンセル | SCR-001へ               |

## StartPracticeUseCase

```text
1. PracticeSession作成
2. ScenarioState作成
3. RecordingPort.start
4. RecordingMetadata保存
5. 状態をactiveへ遷移
6. SCR-008へ
```

---

# SCR-008 AI顧客との練習

## 目的

録画しながらAI顧客と音声会話を行う。

## 主要状態

```typescript
type PracticeScreenState =
  | "initializing"
  | "listening"
  | "transcribing"
  | "generating_response"
  | "client_speaking"
  | "paused"
  | "ending"
  | "error";
```

## 発話処理

```text
ユーザー発話
→ VADで発話区間確定
→ POST /api/v1/stt/transcriptions
→ Scenario Engine更新
→ POST /api/v1/ai/client-responses
→ Scenario Engine更新
→ SpeechSynthesis
```

## ボタン・処理

| UI        | 処理                            |
| --------- | ----------------------------- |
| 一時停止      | `PausePracticeUseCase`        |
| 再開        | `ResumePracticeUseCase`       |
| 会話を終了     | 確認後`EndPracticeUseCase`       |
| 安全に終了する   | `EmergencyEndPracticeUseCase` |
| AI応答を再試行  | `RetryClientResponseUseCase`  |
| 音声をもう一度聞く | TTSの重複再生防止を解除後、明示的再生          |

## HTTP API

### 文字起こし

```text
POST /api/v1/stt/transcriptions
```

### AI顧客返答

```text
POST /api/v1/ai/client-responses
```

## 練習終了条件

* ユーザーが終了
* 時間切れ
* 緊急終了
* 外部APIが規定回数失敗
* 録画が継続不能

どの終了理由でもSCR-009へ進む。

---

# SCR-009 練習後自己評価

## 目的

AI評価を見る前に、ユーザー自身の感覚を保存する。

## 入力

* 緊張度
* 自信度
* 最後まで話せた
* 聞きたいことを質問できた
* 頭が真っ白になる場面があった
* 自由記述

## ボタン・処理

| UI       | 処理                                         |
| -------- | ------------------------------------------ |
| 保存して分析する | `SavePostPracticeReviewUseCase`実行後SCR-010へ |
| 後で分析する   | 自己評価だけ保存しSCR-016へ                          |

## API

HTTP APIなし。

---

# SCR-010 分析中

## 目的

音声分析、会話分析、シナリオ評価、フィードバック生成の進捗を表示する。

## 処理

```text
AnalyzePracticeUseCase
├─ AudioAnalysisPort.analyze
├─ POST /api/v1/ai/conversation-analyses
├─ ScenarioEvaluationService.evaluate
├─ FeedbackPrioritizationPolicy.select
└─ AnalysisRepository.save
```

## 表示状態

* 音声を分析中
* 会話内容を分析中
* 確認できた事項を整理中
* フィードバックを作成中

## ボタン・処理

| UI     | 処理              |
| ------ | --------------- |
| 分析を再試行 | 失敗した処理だけ再実行     |
| 結果へ進む  | 部分失敗でもSCR-011へ  |
| 履歴へ戻る  | 分析待ち状態でSCR-016へ |

## HTTP API

```text
POST /api/v1/ai/conversation-analyses
```

---

# SCR-011 総合結果

## 目的

良かった点、確認事項、改善点一つを表示する。

## 表示順

1. 練習前後の自己評価
2. 今回できたこと
3. 取得・確認できた事項
4. 未確認事項
5. 音声・会話指標
6. 最重要改善点一つ
7. 再練習課題

## ボタン・処理

| UI     | 処理                                         |
| ------ | ------------------------------------------ |
| 動画を見る  | SCR-012へ                                   |
| 部分再練習  | `CreatePartialRetryUseCase`の候補を作成しSCR-013へ |
| 履歴へ    | SCR-016へ                                   |
| ホームへ   | SCR-001へ                                   |
| 分析を再実行 | `ReanalyzePracticeUseCase`                 |

## API

再分析時のみ、必要に応じて次を再実行する。

```text
POST /api/v1/ai/conversation-analyses
```

---

# SCR-012 動画振り返り

## 目的

保存済み動画とタイムラインマーカーを確認する。

## 表示

* 動画プレイヤー
* 良かった場面
* 改善候補
* 発話Transcript
* 音声指標
* 動画を見ずに確認するモード

## ボタン・処理

| UI     | 処理                               |
| ------ | -------------------------------- |
| マーカー選択 | 動画を該当時刻へ移動                       |
| お気に入り  | `ToggleRecordingFavoriteUseCase` |
| 動画を削除  | `DeleteRecordingOnlyUseCase`     |
| ダウンロード | Browser Blob download            |
| 部分再練習  | SCR-013へ                         |
| 結果へ戻る  | SCR-011へ                         |

## API

HTTP APIなし。

---

# SCR-013 部分再練習確認

## 目的

最重要改善点に対応する30秒〜2分の課題を確認する。

## 表示

* 改善対象
* 元の発言
* 推奨する回答構造
* 再練習用のAI顧客発言
* 制限時間

## ボタン・処理

| UI     | 処理                         |
| ------ | -------------------------- |
| 再練習を開始 | `StartPartialRetryUseCase` |
| 課題を変更  | 別のテンプレート候補を表示              |
| 結果へ戻る  | SCR-011へ                   |

## API

課題文をAIで自然化する場合のみAI顧客APIを利用できるが、MVPでは定型テンプレートを優先する。

---

# SCR-014 部分再練習

## 目的

改善対象の短い場面だけを再練習する。

## ボタン・処理

| UI    | 処理                       |
| ----- | ------------------------ |
| 回答を開始 | 録音・録画開始                  |
| 完了    | `EndPartialRetryUseCase` |
| もう一度  | 同じRetry ID配下に新Attemptを追加 |
| 中止    | 保存済み内容を保持してSCR-013へ      |

## API

必要な場合のみ、

```text
POST /api/v1/stt/transcriptions
```

会話形式の場合は、

```text
POST /api/v1/ai/client-responses
```

---

# SCR-015 部分再練習結果

## 表示

* 元の結果
* 再練習結果
* 対象指標の変化
* 自己評価
* 再挑戦回数

## ボタン・処理

| UI      | 処理       |
| ------- | -------- |
| もう一度練習  | SCR-014へ |
| 元の結果へ戻る | SCR-011へ |
| 履歴へ     | SCR-016へ |

---

# SCR-016 練習履歴

## 目的

過去の練習と部分再練習を一覧表示する。

## 初期処理

```text
ListPracticeHistoryUseCase
```

## 表示項目

* 日時
* シチュエーション
* 具体的場面
* 難易度
* 顧客タイプ
* 練習時間
* 動画有無
* 緊張度変化
* 通常練習／部分再練習

## ボタン・処理

| UI    | 処理                             |
| ----- | ------------------------------ |
| 履歴カード | SCR-017へ                       |
| 録画管理  | SCR-018へ                       |
| 削除    | `DeletePracticeSessionUseCase` |
| ホーム   | SCR-001へ                       |

## API

HTTP APIなし。

---

# SCR-017 履歴詳細

## 表示

SCR-011と同様の分析結果を読み取り専用で表示する。

## ボタン

* 動画を見る
* 部分再練習
* 同じ条件で練習
* 履歴を削除
* 履歴へ戻る

「同じ条件で練習」は設定を複製し、SCR-005またはSCR-006へ進む。

---

# SCR-018 録画管理

## 目的

最大20本の録画を管理する。

## 表示

* 保存数：`n / 20`
* 推定使用容量
* お気に入り
* 作成日時
* 自動削除対象
* 動画削除済み履歴

## 自動削除ルール

* 21本目の新規録画保存時、最古の非お気に入り動画を削除
* 練習履歴と分析結果は保持
* 20本すべてがお気に入りなら新規録画を開始不可

## ボタン・処理

| UI        | 処理                               |
| --------- | -------------------------------- |
| 再生        | SCR-012へ                         |
| お気に入り     | `ToggleRecordingFavoriteUseCase` |
| 動画削除      | `DeleteRecordingOnlyUseCase`     |
| すべての動画を削除 | `DeleteAllRecordingsUseCase`     |
| 全データ削除    | `DeleteAllLocalDataUseCase`      |

---

# SCR-019 中断データ復旧

## 表示

* 中断日時
* シチュエーション
* 保存済み録画時間
* 保存済み会話ターン
* 復旧可能なデータ

## ボタン・処理

| UI        | 処理                                |
| --------- | --------------------------------- |
| 保存済み内容を見る | 履歴として保存後SCR-017へ                  |
| 同じ条件でやり直す | 設定を複製しSCR-005へ                    |
| 中断データを削除  | `DeleteRecoverableSessionUseCase` |

会話の途中再開はMVP対象外とする。

---

# 7. 管理者画面

# SCR-101 実験モードトップ

## 表示

* シナリオ数
* シナリオバージョン
* Fixture数
* プロンプト数

## ボタン

* シナリオ管理
* 評価比較
* 通常画面へ戻る

---

# SCR-102 シナリオ一覧

## ボタン・処理

| UI      | 処理                         |
| ------- | -------------------------- |
| 新規作成    | 新しいScenario Definitionを作成  |
| 編集      | SCR-103へ                   |
| 複製      | `DuplicateScenarioUseCase` |
| 無効化     | `DisableScenarioUseCase`   |
| バージョン履歴 | 過去version表示                |

HTTP APIなし。

---

# SCR-103 シナリオ編集

## 入力

* タイトル
* 説明
* Scene
* Fact
* 開示条件
* 難易度
* 顧客タイプ
* 評価ルーブリック
* AI禁止事項
* 成功条件

## ボタン

| UI    | 処理                           |
| ----- | ---------------------------- |
| 検証    | Zod SchemaとFact参照を検証         |
| 保存    | `SaveScenarioVersionUseCase` |
| 複製    | 新IDまたは新versionを作成            |
| テスト実行 | Fixtureを利用して会話・評価を確認         |

---

# SCR-104 評価比較

## 目的

同じFixtureを複数プロンプトで評価する。

## ボタン・処理

| UI        | 処理                                          |
| --------- | ------------------------------------------- |
| Fixture選択 | テスト会話を読み込む                                  |
| プロンプト追加   | 比較対象へ追加                                     |
| 比較実行      | `POST /api/v1/admin/evaluation-comparisons` |
| 結果保存      | Prompt versionとしてLocal保存                    |

---
