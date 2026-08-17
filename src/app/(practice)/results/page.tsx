"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { PracticeSession } from "@/modules/practice-session/domain/practice-session";
import { evaluateScenario, type ScenarioEvaluation } from "@/modules/scenario-evaluation/domain/scenario-evaluation";
import { analyzeConversation } from "@/modules/conversation-analysis/domain/conversation-analysis";
import { generateConversationFeedback, type ConversationFeedback } from "@/modules/conversation-analysis/domain/conversation-feedback";
import type { SelfReview } from "@/modules/self-review/domain/self-review";
import { IndexedDbRecordingRepository, LocalPracticeDatabase } from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";
import { resolveEvaluationDefinition } from "@/modules/scenario-evaluation/application/resolve-evaluation-definition";

type ResultData = { review: SelfReview; evaluation: ScenarioEvaluation; feedback: ConversationFeedback };

export default function ResultsPage() {
  const [result, setResult] = useState<ResultData | null | undefined>(undefined);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) { void Promise.resolve(null).then(setResult); return; }
    const repository = new IndexedDbRecordingRepository(new LocalPracticeDatabase());
    void Promise.all([repository.findSelfReview(session.id), repository.findConversation(session.id), repository.findPracticeSession(session.id)]).then(async ([review, conversation, storedSession]) => {
      const definition = storedSession
        ? resolveEvaluationDefinition(storedSession, technicalMvpScenarioFixtures)
        : technicalMvpScenarioFixtures.find((scenario) => scenario.id === session.configuration.scenarioId);
      if (!review || !definition || !conversation) { setResult(null); return; }
      const evaluation = evaluateScenario(definition, conversation.scenarioState, {}, session.configuration.sceneId);
      const analysis = analyzeConversation(conversation.turns);
      const feedback = generateConversationFeedback(evaluation, analysis, session.configuration.focusSkillId);
      await Promise.all([
        repository.saveScenarioEvaluation(session.id, evaluation),
        repository.saveConversationFeedback(session.id, feedback),
      ]);
      setResult({ review, evaluation, feedback });
    });
  }, []);

  if (result === undefined) return <main><section className="panel"><p>結果を確認しています。</p></section></main>;
  if (!result) return <main><section className="panel"><h1>自己評価が必要です</h1><p>結果を見る前に、練習後の自己評価を保存してください。</p><Link className="secondary-link" href="/self-review">自己評価へ戻る</Link></section></main>;
  const { review, evaluation, feedback } = result;
  return <main><section className="panel"><p className="eyebrow">ClientTalk Coach</p><h1>練習結果</h1><p>緊張度: {review.tensionBefore} → {review.tensionAfter}</p><p>自信度: {review.confidenceBefore} → {review.confidenceAfter}</p><section className="feedback-summary" aria-labelledby="strengths-title"><h2 id="strengths-title">今回できたこと</h2>{feedback.strengths.length ? <ul>{feedback.strengths.map((strength) => <li key={strength.id}>{strength.description}</li>)}</ul> : <p>会話を最後まで進められました。</p>}<div className="primary-feedback" data-testid="primary-feedback"><h2>次に練習すること</h2><p>{feedback.primaryImprovement.description}</p><h3>再練習</h3><p>{feedback.primaryImprovement.retryTask}</p><div className="practice-controls"><Link className="primary-action" href="/review">録画を振り返る</Link><Link className="secondary-link" href="/partial-retry">部分再練習へ</Link><Link className="secondary-link" href="/history">練習履歴を見る</Link><Link className="secondary-link" href="/">ホームへ</Link></div></div></section><section className="evaluation-summary"><h2>取得できた事項</h2><ResultList facts={evaluation.capturedFacts} empty="まだありません" /><h2>未確認の重要事項</h2><ResultList facts={evaluation.missingCriticalFacts} empty="ありません" /><h2>未確認事項</h2><ResultList facts={evaluation.missingNormalFacts} empty="ありません" /></section></section></main>;
}

function ResultList({ facts, empty }: { facts: ScenarioEvaluation["capturedFacts"]; empty: string }) {
  return facts.length ? <ul>{facts.map((fact) => <li key={fact.id}>{fact.label}{fact.evidenceId ? <small>（根拠発話: {fact.evidenceId}）</small> : null}</li>)}</ul> : <p>{empty}</p>;
}

function getStoredSession(): PracticeSession | null {
  const stored = window.sessionStorage.getItem("client-talk-coach.practice-session");
  return stored ? (JSON.parse(stored) as PracticeSession) : null;
}
