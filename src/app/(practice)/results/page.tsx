"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { PracticeSession } from "@/modules/practice-session/domain/practice-session";
import type { SelfReview } from "@/modules/self-review/domain/self-review";
import { SessionStorageSelfReviewRepository } from "@/modules/self-review/infrastructure/session-storage-self-review-repository";

export default function ResultsPage() {
  const [review, setReview] = useState<SelfReview | null | undefined>(undefined);

  useEffect(() => {
    const session = getStoredSession();
    const load = session
      ? new SessionStorageSelfReviewRepository().findBySessionId(session.id)
      : Promise.resolve(null);
    void load.then(setReview);
  }, []);

  if (review === undefined) return <main><section className="panel"><p>結果を確認しています。</p></section></main>;
  if (!review) return <main><section className="panel"><h1>自己評価が必要です</h1><p>結果を見る前に、練習後の自己評価を保存してください。</p><Link className="secondary-link" href="/self-review">自己評価へ戻る</Link></section></main>;
  return <main><section className="panel"><p className="eyebrow">ClientTalk Coach</p><h1>練習結果</h1><p>自己評価を保存済みです。AIによる詳細フィードバックは次の実装で追加します。</p><p>緊張度: {review.tensionBefore} → {review.tensionAfter}</p><p>自信度: {review.confidenceBefore} → {review.confidenceAfter}</p></section></main>;
}

function getStoredSession(): PracticeSession | null {
  const stored = window.sessionStorage.getItem("client-talk-coach.practice-session");
  return stored ? (JSON.parse(stored) as PracticeSession) : null;
}
