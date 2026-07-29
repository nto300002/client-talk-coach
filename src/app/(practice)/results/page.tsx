"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { PracticeSession } from "@/modules/practice-session/domain/practice-session";
import { createScenarioState } from "@/modules/scenario/domain/scenario-state";
import { evaluateScenario, type ScenarioEvaluation } from "@/modules/scenario-evaluation/domain/scenario-evaluation";
import { loadScenarioState } from "@/modules/scenario-evaluation/infrastructure/session-storage-scenario-state";
import type { SelfReview } from "@/modules/self-review/domain/self-review";
import { SessionStorageSelfReviewRepository } from "@/modules/self-review/infrastructure/session-storage-self-review-repository";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";

type ResultData = { review: SelfReview; evaluation: ScenarioEvaluation };

export default function ResultsPage() {
  const [result, setResult] = useState<ResultData | null | undefined>(undefined);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) { void Promise.resolve(null).then(setResult); return; }
    void new SessionStorageSelfReviewRepository().findBySessionId(session.id).then((review) => {
      const definition = technicalMvpScenarioFixtures.find((scenario) => scenario.id === session.configuration.scenarioId);
      if (!review || !definition) { setResult(null); return; }
      const state = loadScenarioState(session.id) ?? createScenarioState(definition);
      setResult({ review, evaluation: evaluateScenario(definition, state) });
    });
  }, []);

  if (result === undefined) return <main><section className="panel"><p>結果を確認しています。</p></section></main>;
  if (!result) return <main><section className="panel"><h1>自己評価が必要です</h1><p>結果を見る前に、練習後の自己評価を保存してください。</p><Link className="secondary-link" href="/self-review">自己評価へ戻る</Link></section></main>;
  const { review, evaluation } = result;
  return <main><section className="panel"><p className="eyebrow">ClientTalk Coach</p><h1>練習結果</h1><p>緊張度: {review.tensionBefore} → {review.tensionAfter}</p><p>自信度: {review.confidenceBefore} → {review.confidenceAfter}</p><section className="evaluation-summary"><h2>取得できた事項</h2><ResultList facts={evaluation.capturedFacts} empty="まだありません" /><h2>未確認の重要事項</h2><ResultList facts={evaluation.missingCriticalFacts} empty="ありません" /><h2>未確認事項</h2><ResultList facts={evaluation.missingNormalFacts} empty="ありません" /></section></section></main>;
}

function ResultList({ facts, empty }: { facts: ScenarioEvaluation["capturedFacts"]; empty: string }) {
  return facts.length ? <ul>{facts.map((fact) => <li key={fact.id}>{fact.label}</li>)}</ul> : <p>{empty}</p>;
}

function getStoredSession(): PracticeSession | null {
  const stored = window.sessionStorage.getItem("client-talk-coach.practice-session");
  return stored ? (JSON.parse(stored) as PracticeSession) : null;
}
