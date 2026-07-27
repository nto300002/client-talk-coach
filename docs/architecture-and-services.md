# 受託開発向けAI顧客折衝トレーニングアプリ

## 個人用MVP 詳細設計

# 1. アーキテクチャ方針

本MVPは、Next.js App RouterとTypeScriptを用いたローカルファースト構成とする。

動画、自己評価、分析結果、練習履歴はIndexedDBへ保存し、外部APIは次の処理だけに利用する。

* Google Cloud Speech-to-Textによる文字起こし
* Gemini Flash-LiteによるAI顧客応答
* Gemini Flash-Liteによる会話内容分析

音声合成、録画、音量分析、シナリオ状態管理、要件取得判定、フィードバック優先順位判定はブラウザ内で実行する。

```text
Presentation
    ↓
Application
    ↓
Domain
    ↑
Infrastructure
```

依存方向は、外側から内側への一方向とする。

* PresentationはApplicationを呼ぶ
* ApplicationはDomainとPortを利用する
* InfrastructureはApplicationが定義したPortを実装する
* DomainはNext.js、React、Gemini、IndexedDBを知らない

---

# 2. 層ごとの責務

## 2.1 Presentation層

対象：

* Next.jsページ
* Reactコンポーネント
* Zustandストア
* フォーム
* 画面遷移
* 入力エラー表示
* ローディング表示
* ユーザー向けエラー表示

Presentation層は業務ルールを持たない。

例えば、難易度5が難易度1以上の圧力設定を持つか、重大な確認漏れが声量より優先されるか、といったルールはPresentation層へ実装しない。

```typescript
type PracticeSetupViewModel = {
  scenarioId?: string;
  sceneId?: string;
  difficulty?: DifficultyLevel;
  clientTypeId?: string;
  focusSkill?: FocusSkill;
  durationMinutes: 5 | 7 | 10;
  canProceed: boolean;
};
```

Presentation層はViewModelを表示し、ユーザー操作をApplicationのユースケースへ渡す。

---

## 2.2 Application層

Application層は、ユーザーの目的に対応するユースケースを実行する。

主なユースケース：

* 練習設定を作成する
* 練習セッションを開始する
* ユーザー発話を文字起こしする
* AI顧客の返答を生成する
* シナリオ状態を更新する
* 練習を一時停止する
* 練習を終了する
* 自己評価を保存する
* 音声を分析する
* 会話内容を分析する
* シナリオ固有評価を確定する
* フィードバックを生成する
* 部分再練習を作成する
* 履歴を取得する
* 練習記録を削除する
* 期限切れ録画を削除する

Application層は複数のDomainオブジェクト、Repository、外部サービスを協調させる。

例：

```typescript
interface FinalizePracticeUseCase {
  execute(input: FinalizePracticeInput): Promise<FinalizePracticeOutput>;
}
```

`FinalizePracticeUseCase`は次を順番に実行する。

1. セッションを終了状態へする
2. 録画を停止する
3. シナリオ状態を固定する
4. 自己評価入力待ちへ遷移する
5. 保存可能なデータを永続化する

---

## 2.3 Domain層

Domain層は、受託開発の練習に関する業務ルールを保持する。

主なDomainオブジェクト：

* PracticeSession
* PracticeConfiguration
* ScenarioDefinition
* ConcreteScene
* DifficultyConfiguration
* ClientType
* ScenarioFact
* ScenarioState
* ConversationTurn
* SelfReview
* AudioMetrics
* ConversationAnalysis
* ScenarioEvaluation
* FeedbackResult
* PartialRetryTask

Domain層で扱うルール：

* 選択可能な難易度
* 顧客タイプとの互換性
* 情報の開示条件
* 要件の確認状態
* セッション状態遷移
* フィードバックの優先順位
* シナリオ固有評価
* 前回比較条件
* 自動削除対象判定

Domain層ではAPI呼び出しやIndexedDB操作を行わない。

---

## 2.4 Infrastructure層

Infrastructure層は外部技術との接続を担当する。

対象：

* Google Speech-to-Text
* Gemini API
* SpeechSynthesis
* MediaDevices
* MediaRecorder
* Web Audio API
* IndexedDB
* Dexie
* Next.js Route Handler
* 時刻取得
* UUID生成

Infrastructure層はApplication層が定義したPortを実装する。

```typescript
interface TranscriptionPort {
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

class GoogleSpeechTranscriptionAdapter implements TranscriptionPort {
  async transcribe(
    input: TranscriptionInput
  ): Promise<TranscriptionResult> {
    // Google STTへの接続
  }
}
```

---

# 3. サービス層の要否

## 3.1 結論

**Application Serviceは必要。汎用CRUD Serviceは不要。**

本アプリは単純な登録・更新・削除アプリではない。

次の処理は複数の状態、外部サービス、業務ルールをまたぐ。

* 録画開始と練習開始の同期
* STT結果からAI応答生成
* AI応答によるシナリオ状態更新
* 練習終了後の複数分析
* 重大度と重点技能を考慮したフィードバック生成
* 部分再練習作成
* セッション削除時の関連データ一括削除

したがって、Repositoryを直接UIから呼ぶ構成や、汎用的な`PracticeService.create()`だけでは不十分である。

## 3.2 採用するサービス

### Application Service

ユースケースごとに作成する。

```text
CreatePracticeConfigurationUseCase
StartPracticeUseCase
ProcessUserUtteranceUseCase
PausePracticeUseCase
ResumePracticeUseCase
EndPracticeUseCase
SavePostPracticeReviewUseCase
AnalyzePracticeUseCase
GenerateFeedbackUseCase
CreatePartialRetryUseCase
DeletePracticeSessionUseCase
```

### Domain Service

一つのEntityだけでは表現しにくい純粋な業務ルールに限定する。

```text
ScenarioCompatibilityPolicy
DifficultyRecommendationPolicy
DisclosurePolicy
ScenarioEvaluationService
FeedbackPrioritizationPolicy
PreviousSessionMatchingPolicy
RecordingExpirationPolicy
```

## 3.3 作成しないもの

次のような汎用サービスは作成しない。

```text
ScenarioService
PracticeService
DatabaseService
GeminiService
```

責務が広すぎて、テスト対象と変更理由が不明確になるためである。

---
