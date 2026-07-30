"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { PracticeSession } from "@/modules/practice-session/domain/practice-session";
import { createScenarioState } from "@/modules/scenario/domain/scenario-state";
import { evaluateScenario, type ScenarioEvaluation } from "@/modules/scenario-evaluation/domain/scenario-evaluation";
import { loadScenarioState } from "@/modules/scenario-evaluation/infrastructure/session-storage-scenario-state";
import { analyzeConversation } from "@/modules/conversation-analysis/domain/conversation-analysis";
import { generateConversationFeedback, type ConversationFeedback } from "@/modules/conversation-analysis/domain/conversation-feedback";
import { loadConversationTurns } from "@/modules/conversation-analysis/infrastructure/session-storage-conversation-turns";
import type { SelfReview } from "@/modules/self-review/domain/self-review";
import { SessionStorageSelfReviewRepository } from "@/modules/self-review/infrastructure/session-storage-self-review-repository";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";

type ResultData = { review: SelfReview; evaluation: ScenarioEvaluation; feedback: ConversationFeedback };

export default function ResultsPage() {
  const [result, setResult] = useState<ResultData | null | undefined>(undefined);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) { void Promise.resolve(null).then(setResult); return; }
    void new SessionStorageSelfReviewRepository().findBySessionId(session.id).then((review) => {
      const definition = technicalMvpScenarioFixtures.find((scenario) => scenario.id === session.configuration.scenarioId);
      if (!review || !definition) { setResult(null); return; }
      const state = loadScenarioState(session.id) ?? createScenarioState(definition);
      const evaluation = evaluateScenario(definition, state);
      const analysis = analyzeConversation(loadConversationTurns(session.id));
      setResult({ review, evaluation, feedback: generateConversationFeedback(evaluation, analysis, session.configuration.focusSkillId) });
    });
  }, []);

  if (result === undefined) return <main><section className="panel"><p>結果を確認しています。</p></section></main>;
  if (!result) return <main><section className="panel"><h1>自己評価が必要です</h1><p>結果を見る前に、練習後の自己評価を保存してください。</p><Link className="secondary-link" href="/self-review">自己評価へ戻る</Link></section></main>;
  const { review, evaluation, feedback } = result;
  return <main><section className="panel"><p className="eyebrow">ClientTalk Coach</p><h1>練習結果</h1><p>緊張度: {review.tensionBefore} → {review.tensionAfter}</p><p>自信度: {review.confidenceBefore} → {review.confidenceAfter}</p><section className="feedback-summary" aria-labelledby="strengths-title"><h2 id="strengths-title">今回できたこと</h2>{feedback.strengths.length ? <ul>{feedback.strengths.map((strength) => <li key={strength.id}>{strength.description}</li>)}</ul> : <p>会話を最後まで進められました。</p>}<div className="primary-feedback" data-testid="primary-feedback"><h2>次に練習すること</h2><p>{feedback.primaryImprovement.description}</p><h3>再練習</h3><p>{feedback.primaryImprovement.retryTask}</p></div></section><section className="evaluation-summary"><h2>取得できた事項</h2><ResultList facts={evaluation.capturedFacts} empty="まだありません" /><h2>未確認の重要事項</h2><ResultList facts={evaluation.missingCriticalFacts} empty="ありません" /><h2>未確認事項</h2><ResultList facts={evaluation.missingNormalFacts} empty="ありません" /></section></section></main>;
}

function ResultList({ facts, empty }: { facts: ScenarioEvaluation["capturedFacts"]; empty: string }) {
  return facts.length ? <ul>{facts.map((fact) => <li key={fact.id}>{fact.label}</li>)}</ul> : <p>{empty}</p>;
}

function getStoredSession(): PracticeSession | null {
  const stored = window.sessionStorage.getItem("client-talk-coach.practice-session");
  return stored ? (JSON.parse(stored) as PracticeSession) : null;
}
