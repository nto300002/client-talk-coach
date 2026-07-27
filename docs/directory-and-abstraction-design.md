# 18. 推奨ディレクトリ構成

```text
src/
├─ app/
│  ├─ (practice)/
│  │  ├─ setup/
│  │  ├─ device-check/
│  │  ├─ session/[sessionId]/
│  │  ├─ self-review/[sessionId]/
│  │  ├─ result/[sessionId]/
│  │  ├─ retry/[retryId]/
│  │  └─ history/
│  ├─ admin/
│  │  ├─ scenarios/
│  │  ├─ prompts/
│  │  └─ fixtures/
│  └─ api/
│     └─ v1/
│        ├─ stt/
│        │  └─ transcriptions/route.ts
│        ├─ ai/
│        │  ├─ client-responses/route.ts
│        │  └─ conversation-analyses/route.ts
│        └─ admin/
│           └─ evaluation-comparisons/route.ts
│
├─ modules/
│  ├─ practice/
│  │  ├─ domain/
│  │  │  ├─ entities/
│  │  │  ├─ value-objects/
│  │  │  ├─ policies/
│  │  │  ├─ services/
│  │  │  ├─ events/
│  │  │  └─ errors/
│  │  ├─ application/
│  │  │  ├─ ports/
│  │  │  ├─ use-cases/
│  │  │  ├─ dto/
│  │  │  └─ mappers/
│  │  ├─ infrastructure/
│  │  │  ├─ indexeddb/
│  │  │  ├─ media/
│  │  │  ├─ audio/
│  │  │  ├─ http/
│  │  │  └─ repositories/
│  │  └─ presentation/
│  │     ├─ components/
│  │     ├─ hooks/
│  │     ├─ stores/
│  │     └─ view-models/
│  │
│  ├─ scenario/
│  │  ├─ domain/
│  │  ├─ application/
│  │  ├─ infrastructure/
│  │  └─ presentation/
│  │
│  ├─ analysis/
│  │  ├─ domain/
│  │  ├─ application/
│  │  └─ infrastructure/
│  │
│  └─ admin-experiment/
│     ├─ domain/
│     ├─ application/
│     └─ presentation/
│
├─ shared/
│  ├─ kernel/
│  │  ├─ result.ts
│  │  ├─ errors.ts
│  │  ├─ clock.ts
│  │  └─ id.ts
│  ├─ schemas/
│  └─ utilities/
│
├─ composition/
│  ├─ browser-container.ts
│  ├─ server-container.ts
│  └─ test-container.ts
│
└─ scenarios/
   ├─ initial-requirements/
   ├─ vague-request/
   ├─ estimate-explanation/
   ├─ specification-alignment/
   ├─ scope-change/
   ├─ progress-report/
   ├─ delay-explanation/
   ├─ incident-response/
   ├─ complaint-response/
   ├─ delivery-maintenance/
   └─ meeting-facilitation/

tests/
├─ unit/
├─ component/
├─ integration/
├─ e2e/
├─ fixtures/
│  ├─ conversations/
│  ├─ scenarios/
│  ├─ audio/
│  └─ ai-responses/
└─ contracts/
```

---

# 19. APIを抽象化する粒度

## 19.1 抽象化する

* STT Provider
* AI顧客Provider
* 会話分析Provider
* TTS
* MediaDevices
* Recording
* AudioAnalysis
* IndexedDB Repository
* Clock
* ID生成

## 19.2 抽象化しすぎない

次はPhase 0では不要。

* 汎用HTTP Client Framework
* 全テーブル共通Generic Repository
* 全AI Provider共通の巨大Interface
* イベントバス
* CQRS基盤
* Message Queue
* Microservices
* Unit of Work抽象
* 独自DIコンテナ

特に次のようなGeneric Repositoryは使用しない。

```typescript
interface GenericRepository<T> {
  create(value: T): Promise<T>;
  find(id: string): Promise<T>;
  update(value: T): Promise<T>;
  delete(id: string): Promise<void>;
}
```

PracticeSessionとRecordingChunkでは必要な検索、削除、整合性条件が異なるため、ドメイン固有Repositoryを定義する。

---
