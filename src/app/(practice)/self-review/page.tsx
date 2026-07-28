"use client";

import Link from "next/link";
import type { PracticeSession } from "@/modules/practice-session/domain/practice-session";

export default function SelfReviewPage() {
  const session = getStoredPracticeSession();

  return (
    <main>
      <section className="panel" aria-labelledby="self-review-title">
        <p className="eyebrow">ClientTalk Coach</p>
        <h1 id="self-review-title">練習後の自己評価</h1>
        <p>
          AIの評価を見る前に、今回の感覚を振り返ります。詳しい自己評価フォームは次のIssueで追加します。
        </p>
        {session ? <p>終了理由: {formatEndReason(session.endReason)}</p> : null}
        <Link className="secondary-link" href="/setup">
          新しい練習を設定する
        </Link>
      </section>
    </main>
  );
}

function getStoredPracticeSession(): PracticeSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.sessionStorage.getItem("client-talk-coach.practice-session");
  return stored ? (JSON.parse(stored) as PracticeSession) : null;
}

function formatEndReason(reason: PracticeSession["endReason"]): string {
  return reason === "emergency_end" ? "安全終了" : "通常終了";
}
