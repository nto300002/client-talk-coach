
Application層は次のインターフェースだけを知る。

## 11.1 外部AI関連

```typescript
interface TranscriptionPort {
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

interface AiClientPort {
  generateResponse(
    input: AiClientInput
  ): Promise<AiClientResponse>;
}

interface ConversationAnalysisPort {
  analyze(
    input: ConversationAnalysisInput
  ): Promise<ConversationAnalysisResult>;
}

interface SpeechSynthesisPort {
  speak(input: SpeechInput): Promise<void>;
  cancel(): void;
}
```

## 11.2 メディア関連

```typescript
interface MediaDevicePort {
  requestStream(
    constraints: MediaStreamConstraints
  ): Promise<MediaDeviceSession>;

  stopStream(session: MediaDeviceSession): void;
}

interface RecordingPort {
  start(input: StartRecordingInput): Promise<RecordingHandle>;
  pause(handleId: string): Promise<void>;
  resume(handleId: string): Promise<void>;
  stop(handleId: string): Promise<RecordingResult>;
}

interface AudioAnalysisPort {
  calibrate(input: CalibrationInput): Promise<VolumeBaseline>;
  analyze(input: AnalyzeAudioInput): Promise<AudioMetrics>;
}
```

## 11.3 永続化関連

```typescript
interface PracticeSessionRepository {
  save(session: PracticeSession): Promise<void>;
  findById(id: string): Promise<PracticeSession | null>;
  findHistory(query: HistoryQuery): Promise<PracticeSession[]>;
  deleteById(id: string): Promise<void>;
}

interface RecordingRepository {
  saveMetadata(metadata: RecordingMetadata): Promise<void>;
  saveChunk(chunk: RecordingChunk): Promise<void>;
  findChunks(recordingId: string): Promise<RecordingChunk[]>;
  deleteBySessionId(sessionId: string): Promise<void>;
}

interface ScenarioRepository {
  findScenario(id: string): Promise<ScenarioDefinition | null>;
  listEnabled(): Promise<ScenarioDefinition[]>;
  saveVersion(definition: ScenarioDefinition): Promise<void>;
}

interface AnalysisRepository {
  save(result: PracticeAnalysisResult): Promise<void>;
  findBySessionId(
    sessionId: string
  ): Promise<PracticeAnalysisResult | null>;
}
```

## 11.4 システム関連

```typescript
interface ClockPort {
  now(): Date;
}

interface IdGeneratorPort {
  generate(prefix?: string): string;
}

interface StorageQuotaPort {
  estimate(): Promise<StorageQuota>;
}
```

---

# 12. IndexedDB抽象化

## 12.1 方針

DexieをApplication層やDomain層へ露出しない。

DexieのTable型、トランザクション、IndexedDB例外はInfrastructure層だけで扱う。

## 12.2 テーブル

```text
practiceSessions
practiceConfigurations
selfReviews
conversationTurns
scenarioStates
recordings
recordingChunks
audioMetrics
conversationAnalyses
scenarioEvaluations
feedbackResults
partialRetries
scenarioDefinitions
promptVersions
localSettings
```

## 12.3 主なキー

```text
practiceSessions
- id
- status
- scenarioId
- sceneId
- difficulty
- clientTypeId
- createdAt
- completedAt

conversationTurns
- id
- sessionId
- sequence
- speaker
- startedAtMs

recordingChunks
- id
- recordingId
- sequence
- createdAt

recordings
- id
- sessionId
- createdAt
- deletedAt
- deletionReason
- isFavorite
- status

partialRetries
- id
- originalSessionId
- retryNumber
```

## 12.3.1 RecordingMetadata

```typescript
type RecordingMetadata = {
  id: string;
  sessionId: string;
  createdAt: string;
  deletedAt: string | null;
  deletionReason:
    | "manual"
    | "retention_expired"
    | "recording_limit"
    | null;
  isFavorite: boolean;
  status: "recording" | "completed" | "recoverable" | "deleted";
};
```

通常の保存上限カウントには、`status: "completed"` かつ `deletedAt: null` の録画だけを含める。

`status: "recoverable"` の録画は復旧候補として別枠管理し、20本上限には含めない。

## 12.4 トランザクション

次はDexie transaction内で実行する。

### セッション削除

* PracticeSession削除
* RecordingMetadata削除
* RecordingChunk削除
* SelfReview削除
* ConversationTurn削除
* ScenarioState削除
* Analysis削除
* Feedback削除
* PartialRetry関連解除

### 全データ削除

全テーブル削除を一つのトランザクションとして扱う。

### 練習完了保存

セッション、自己評価、状態、分析の保存を可能な限り一貫させる。

録画チャンク保存は、会話中に独立した小さなトランザクションで逐次実行する。

### 録画20本上限保存

個人用MVPでは、端末内へ保存する完了済み録画を最大20本に制限する。

新しい録画保存時の順序は次とする。

1. 新しい録画メタデータと録画チャンクを保存する。
2. 完了済み録画数が20本を超えるか確認する。
3. 超える場合、最も古い非お気に入り録画を削除対象にする。
4. 削除対象のRecordingMetadataを`status: "deleted"`、`deletionReason: "recording_limit"`、`deletedAt`ありに更新する。
5. 削除対象に紐づくRecordingChunkを削除する。
6. PracticeSession、SelfReview、AudioMetrics、ConversationAnalysis、ScenarioEvaluation、FeedbackResultは削除しない。

新しい録画の保存に失敗した場合、既存録画の削除処理は実行しない。

20本すべてがお気に入りの場合、新しい録画の開始前に`RecordingLimitReachedError`を返し、録画開始を止める。

同じ保存要求の再送で複数動画を削除しないよう、保存処理は録画ID単位で冪等に扱う。

### 手動動画削除

ユーザーが動画だけを手動削除した場合、RecordingMetadataを`status: "deleted"`、`deletionReason: "manual"`、`deletedAt`ありに更新し、RecordingChunkを削除する。

PracticeSession、SelfReview、AudioMetrics、ConversationAnalysis、ScenarioEvaluation、FeedbackResultは保持する。

---
