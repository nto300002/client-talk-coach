"use client";

import Link from "next/link";
import { useState } from "react";

import type { PracticeSession } from "@/modules/practice-session/domain/practice-session";
import { SaveSelfReview } from "@/modules/self-review/application/save-self-review";
import type { SelfReview } from "@/modules/self-review/domain/self-review";
import { SessionStorageSelfReviewRepository } from "@/modules/self-review/infrastructure/session-storage-self-review-repository";
import { SelfReviewForm } from "@/modules/self-review/presentation/self-review-form";

export default function SelfReviewPage() {
  const session = getStoredPracticeSession();
  const [review, setReview] = useState<SelfReview | null>(null);
  const [saveSelfReview] = useState(() => new SaveSelfReview(new SessionStorageSelfReviewRepository()));

  return (
    <main>
      <section className="panel" aria-labelledby="self-review-title">
        <p className="eyebrow">ClientTalk Coach</p>
        <h1 id="self-review-title">練習後の自己評価</h1>
        <p>AIの評価を見る前に、今回の感覚を振り返ります。</p>
        {session ? <p>終了理由: {formatEndReason(session.endReason)}</p> : <p className="status-error">練習記録が見つかりません。</p>}
        {session && !review ? (
          <SelfReviewForm
            sessionId={session.id}
            tensionBefore={session.configuration.tensionBefore}
            confidenceBefore={session.configuration.confidenceBefore}
            saveSelfReview={saveSelfReview}
            onSaved={setReview}
          />
        ) : null}
        {review ? (
          <div className="self-review-saved" aria-live="polite">
            <p>自己評価を保存しました。</p>
            <p>緊張度の変化: {formatDifference(review.tensionDifference)} / 自信度の変化: {formatDifference(review.confidenceDifference)}</p>
            <Link className="primary-action" href="/results">結果を見る</Link>
          </div>
        ) : null}
        <Link className="secondary-link" href="/setup">新しい練習を設定する</Link>
      </section>
    </main>
  );
}

function getStoredPracticeSession(): PracticeSession | null {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem("client-talk-coach.practice-session");
  return stored ? (JSON.parse(stored) as PracticeSession) : null;
}

function formatEndReason(reason: PracticeSession["endReason"]): string { return reason === "emergency_end" ? "安全終了" : "通常終了"; }
function formatDifference(value: number): string { return value > 0 ? `+${value}` : String(value); }
