# 16. エラー設計

## 16.1 エラー分類

```typescript
type AppErrorCategory =
  | "validation"
  | "device"
  | "recording"
  | "storage"
  | "transcription"
  | "ai"
  | "tts"
  | "network"
  | "analysis"
  | "unexpected";
```

## 16.2 Applicationエラー

```typescript
type AppError = {
  code: string;
  category: AppErrorCategory;
  userMessage: string;
  retryable: boolean;
  recoverable: boolean;
  cause?: unknown;
};
```

`cause`はログ用途のみであり、Presentation層には渡さない。

## 16.3 エラーマッピング例

| Infrastructureエラー     | Applicationエラー           |
| --------------------- | ------------------------ |
| NotAllowedError       | CAMERA_PERMISSION_DENIED |
| NotFoundError         | MICROPHONE_NOT_FOUND     |
| QuotaExceededError    | STORAGE_QUOTA_EXCEEDED   |
| Google 429            | STT_RATE_LIMITED         |
| Gemini timeout        | AI_TIMEOUT               |
| SpeechSynthesis error | TTS_FAILED               |
| Dexie BulkError       | LOCAL_SAVE_FAILED        |

## 16.4 リトライ

| 処理       |            自動リトライ |
| -------- | ----------------: |
| 録画開始     |                なし |
| 録画チャンク保存 |                2回 |
| STT      |                2回 |
| AI応答     |                2回 |
| TTS      | なし、テキスト表示へフォールバック |
| 会話分析     |                2回 |
| セッション削除  |                1回 |

指数バックオフを用いる。

```text
1回目：500ms
2回目：1500ms
```

## 16.5 エラー時のデータ保持

* STT失敗：録画を維持し、再送可能にする
* AI失敗：Transcriptを維持する
* TTS失敗：テキスト応答を表示する
* 分析失敗：セッションを保存し、後から再分析可能にする
* IndexedDB失敗：録画をRecoverable状態として表示する
* 緊急終了：保存済みチャンクを保持する

---

# 17. TDD可能な依存関係

## 17.1 Constructor Injection

Application Use CaseへPortを注入する。

```typescript
class ProcessUserUtteranceUseCase {
  constructor(
    private readonly transcriptionPort: TranscriptionPort,
    private readonly aiClientPort: AiClientPort,
    private readonly sessionRepository: PracticeSessionRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly clock: ClockPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  async execute(
    input: ProcessUserUtteranceInput
  ): Promise<ProcessUserUtteranceOutput> {
    // ユースケース
  }
}
```

テストではFakeを渡す。

```typescript
const useCase = new ProcessUserUtteranceUseCase(
  new FakeTranscriptionPort(),
  new FakeAiClientPort(),
  new InMemoryPracticeSessionRepository(),
  new InMemoryConversationRepository(),
  new FixedClock(),
  new SequentialIdGenerator()
);
```

## 17.2 テスト用実装

```text
FakeTranscriptionPort
FakeAiClientPort
FakeConversationAnalysisPort
FakeSpeechSynthesisPort
FakeMediaDevicePort
FakeRecordingPort
InMemoryPracticeSessionRepository
InMemoryRecordingRepository
FixedClock
SequentialIdGenerator
```

Unit TestではNext.js、Dexie、MediaRecorderを起動しない。

## 17.3 Composition Root

実際のAdapter組み立ては一か所へ集約する。

```text
src/composition/browser-container.ts
src/composition/server-container.ts
src/composition/test-container.ts
```

Reactコンポーネント内部で直接`new GoogleSttClient()`などを実行しない。

---
