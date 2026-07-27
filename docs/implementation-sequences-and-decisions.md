# 20. 主要シーケンス

## 20.1 ユーザー発話処理

```text
User
→ Presentation
→ ProcessUserUtteranceUseCase
→ TranscriptionPort
→ /api/v1/stt/transcriptions
→ Google STT
← Transcript
→ Scenario Engine
→ eligibleFacts更新
→ AiClientPort
→ /api/v1/ai/client-responses
→ Gemini
← AI Response
→ Scenario Engine
→ disclosedFacts更新
→ ConversationRepository
→ SpeechSynthesisPort
← AI音声再生
```

## 20.2 練習終了後

```text
User
→ EndPracticeUseCase
→ RecordingPort.stop
→ ScenarioState.freeze
→ SessionRepository.save
→ PostPracticeSelfReview画面
→ SavePostPracticeReviewUseCase
→ AnalyzeAudioUseCase
→ AnalyzeConversationUseCase
→ ScenarioEvaluationService
→ FeedbackPrioritizationPolicy
→ AnalysisRepository.save
→ Result画面
```

---

# 21. 実装上の最終判断

## CRUD API

ローカルデータ用には作成しない。

IndexedDB RepositoryをApplication層から呼ぶ。

## サービス層

Application Serviceをユースケース単位で作成する。

Domain Serviceは純粋な複合ルールだけに限定する。

## 外部API

STT、AI顧客、会話分析の3種類だけRoute Handlerを作る。

## AIの責務

AIは会話生成と文章分析を担当する。

次はAIへ決定させない。

* シナリオFactの存在
* Factの最終取得状態
* 難易度の互換性
* セッション状態遷移
* フィードバック優先順位
* 自動削除
* 前回比較対象

## 完成条件

各Application Use CaseがFake PortとInMemory Repositoryで単体テストでき、実際のGoogle API、Gemini、IndexedDB、MediaRecorderなしで主要業務フローを検証できることを、詳細設計上の完成条件とする。
