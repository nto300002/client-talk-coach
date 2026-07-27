
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

partialRetries
- id
- originalSessionId
- retryNumber
```

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

---
