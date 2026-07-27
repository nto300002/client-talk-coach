# 4. CRUDとユースケースAPIの切り分け

## 4.1 CRUDでよい処理

次の処理はRepositoryのCRUDとして扱える。

* シナリオ定義の保存
* シナリオ定義の取得
* プロンプトバージョンの保存
* ローカル設定の保存
* セッション履歴の取得
* 録画チャンクの保存
* 録画チャンクの削除

ただし、Presentation層からRepositoryを直接呼ばない。

必ずApplication層を経由する。

## 4.2 ユースケースとして扱う処理

次は単純CRUDではない。

| 処理        | 理由                      |
| --------- | ----------------------- |
| 練習開始      | デバイス、保存容量、設定、録画を調整する    |
| ユーザー発話処理  | STT、履歴、シナリオ状態、AI応答を連携する |
| 練習終了      | 録画停止、状態固定、自己評価へ遷移する     |
| 分析実行      | 音声、会話、シナリオ評価を統合する       |
| フィードバック生成 | 優先順位と重点技能を考慮する          |
| セッション削除   | 関連データをトランザクションで削除する     |
| 期限切れ削除    | 保存期限、お気に入り、境界日を判定する     |
| 部分再練習作成   | 元セッションと改善項目から課題を作る      |

HTTP APIも、汎用CRUD APIではなく外部AI処理に対応するユースケースAPIとする。

---

# 5. HTTP APIの範囲

個人用MVPでは、ローカルデータのCRUDをHTTP API化しない。

IndexedDBへ直接アクセスするInfrastructure Adapterを用いる。

HTTP APIが必要なのは、秘密鍵をブラウザへ置けない次の処理だけである。

```text
POST /api/v1/stt/transcriptions
POST /api/v1/ai/client-responses
POST /api/v1/ai/conversation-analyses
POST /api/v1/admin/evaluation-comparisons
```

TTSはブラウザのSpeechSynthesisを使うため、HTTP APIは作成しない。

音声分析もWeb Audio APIで実行するため、HTTP APIは作成しない。

---

# 6. 共通APIレスポンス

## 6.1 成功レスポンス

```typescript
type ApiSuccess<T> = {
  data: T;
  meta: {
    requestId: string;
    processedAt: string;
    durationMs: number;
  };
};
```

## 6.2 エラーレスポンス

```typescript
type ApiFailure = {
  error: {
    code: ApiErrorCode;
    message: string;
    retryable: boolean;
    requestId: string;
  };
};
```

レスポンスに次を含めない。

* 会話全文
* 音声データ
* 動画データ
* 自己評価内容
* 生のスタックトレース
* 外部APIの秘密情報

---

# 7. STT API

## 7.1 Endpoint

```text
POST /api/v1/stt/transcriptions
```

## 7.2 目的

VADで切り出したユーザー発話を日本語テキストへ変換する。

録画全体を送信せず、一発話単位で送信する。

## 7.3 入力

Content-Typeは`multipart/form-data`とする。

```typescript
type TranscriptionRequestMetadata = {
  sessionId: string;
  utteranceId: string;
  startedAtMs: number;
  endedAtMs: number;
  locale: "ja-JP";
  mimeType: string;
};
```

FormData：

```text
audio: Blob
metadata: JSON string
```

制約：

* 最大音声時間：30秒
* 許可MIME：audio/webm、audio/ogg、audio/wav
* 最大サイズ：5MB
* `utteranceId`はセッション内で一意

## 7.4 出力

```typescript
type TranscriptionResponse = {
  utteranceId: string;
  transcript: string;
  confidence?: number;
  startedAtMs: number;
  endedAtMs: number;
  isEmpty: boolean;
};
```

例：

```json
{
  "data": {
    "utteranceId": "utt_01",
    "transcript": "実際に利用する職員は何人でしょうか",
    "confidence": 0.93,
    "startedAtMs": 12000,
    "endedAtMs": 15600,
    "isEmpty": false
  },
  "meta": {
    "requestId": "req_123",
    "processedAt": "2026-07-27T02:00:00Z",
    "durationMs": 640
  }
}
```

## 7.5 エラー

```text
STT_INVALID_AUDIO
STT_AUDIO_TOO_LARGE
STT_UNSUPPORTED_MIME
STT_EMPTY_AUDIO
STT_PROVIDER_TIMEOUT
STT_PROVIDER_UNAVAILABLE
STT_RATE_LIMITED
```

## 7.6 TDD要件

* 正常音声からTranscript DTOを返す
* 空音声では`isEmpty=true`を返す
* 不正MIMEを外部APIへ送る前に拒否する
* `utteranceId`をそのまま返す
* Providerエラーを安全なエラーコードへ変換する
* ログに音声BlobとTranscriptを出さない

---

# 8. AI顧客応答API

## 8.1 Endpoint

```text
POST /api/v1/ai/client-responses
```

## 8.2 入力

```typescript
type GenerateClientResponseRequest = {
  sessionId: string;
  userTurnId: string;
  scenario: {
    scenarioId: string;
    scenarioVersion: number;
    sceneId: string;
  };
  difficulty: DifficultyConfigurationDto;
  clientType: ClientTypeDto;
  latestUserUtterance: {
    text: string;
    startedAtMs: number;
    endedAtMs: number;
  };
  recentTurns: ConversationTurnDto[];
  scenarioContext: {
    disclosedFacts: ScenarioFactDto[];
    eligibleFacts: ScenarioFactDto[];
    prohibitedFacts: string[];
    unresolvedItems: string[];
    agreements: AgreementDto[];
  };
};
```

`eligibleFacts`には、現在の開示条件を満たした情報だけを渡す。

未開示かつ開示条件未達の情報は、原則としてAI入力へ含めない。

## 8.3 出力

```typescript
type GenerateClientResponseResponse = {
  turnId: string;
  text: string;
  sentences: string[];
  questionCount: number;
  disclosedFactIds: string[];
  clientStateUpdate?: {
    resistanceDelta?: number;
    cooperationDelta?: number;
  };
};
```

## 8.4 検証

Route HandlerはAI出力をZodで検証する。

* 1〜3文を原則とする
* 質問は最大1つ
* `disclosedFactIds`は`eligibleFacts`内だけ
* 存在しないFact IDを拒否する
* 空文字を拒否する
* 禁止表現を検査する

検証に失敗した場合、一度だけ再生成する。

再生成にも失敗した場合はエラーを返す。

## 8.5 エラー

```text
AI_INVALID_CONTEXT
AI_INVALID_RESPONSE
AI_PROVIDER_TIMEOUT
AI_PROVIDER_UNAVAILABLE
AI_RATE_LIMITED
AI_SAFETY_REJECTED
```

## 8.6 TDD要件

* 隠し情報をAI入力へ含めない
* 開示可能Factだけを返せる
* 存在しないFact IDを拒否する
* 2つ以上質問を含む応答を再生成する
* 同じ`userTurnId`に対する重複処理をApplication層で防ぐ
* TTS失敗時もResponse textを保持する

---

# 9. 会話分析API

## 9.1 Endpoint

```text
POST /api/v1/ai/conversation-analyses
```

## 9.2 目的

文字起こし済み会話から、質問分類、回答構造、直接性、技術説明、合意事項を抽出する。

シナリオ固有の要件取得判定は、このAPIでは行わない。

要件取得判定はローカルのDomain層で確定する。

## 9.3 入力

```typescript
type ConversationAnalysisRequest = {
  sessionId: string;
  scenarioId: string;
  focusSkill: FocusSkill;
  turns: ConversationTurnDto[];
  technicalTerms: TechnicalTermDefinitionDto[];
};
```

## 9.4 出力

```typescript
type ConversationAnalysisResponse = {
  findings: AnalysisFindingDto[];
  questionClassifications: {
    turnId: string;
    category: QuestionCategory;
    evidenceText: string;
  }[];
  agreements: AgreementDto[];
  explainedTechnicalTerms: string[];
  unexplainedTechnicalTerms: {
    term: string;
    turnId: string;
  }[];
};
```

```typescript
type AnalysisFindingDto = {
  id: string;
  category:
    | "conclusion_first"
    | "long_preface"
    | "direct_answer"
    | "topic_scattering"
    | "technical_explanation"
    | "agreement";
  severity: "info" | "normal" | "high";
  evidenceTurnIds: string[];
  explanation: string;
};
```

## 9.5 制約

* EvidenceのないFindingは拒否する
* 存在しないTurn IDを参照するFindingは拒否する
* Agreementが存在しない場合は空配列を返す
* 感情診断、性格評価は出力させない

## 9.6 TDD要件

固定Transcript Fixtureに対して次を検証する。

* 納期質問をschedule confirmationへ分類する
* 利用者質問をuser confirmationへ分類する
* 結論先行発言を検出する
* 長い前置きを改善候補にする
* 説明済み技術用語を誤検出しない
* Evidenceなしの評価を無効化する

---

# 10. 管理者評価比較API

## 10.1 Endpoint

```text
POST /api/v1/admin/evaluation-comparisons
```

## 10.2 入力

```typescript
type EvaluationComparisonRequest = {
  fixtureId: string;
  turns: ConversationTurnDto[];
  promptVersions: {
    id: string;
    systemPrompt: string;
    modelConfiguration: ModelConfigurationDto;
  }[];
};
```

## 10.3 出力

```typescript
type EvaluationComparisonResponse = {
  results: {
    promptVersionId: string;
    analysis: ConversationAnalysisResponse;
    schemaValid: boolean;
    validationErrors: string[];
  }[];
};
```

通常練習データは自動的にこのAPIへ渡さない。

管理者が作成したFixtureだけを対象にする。

---

# 11. Application Port設計
