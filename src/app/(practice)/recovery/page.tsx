"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PracticeSession } from "@/modules/practice-session/domain/practice-session";

export default function RecoveryPage() {
  const [session, setSession] = useState<PracticeSession | null | undefined>(undefined);
  useEffect(() => {
    const timer = window.setTimeout(() => setSession(loadSession()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (session === undefined) return <main><section className="panel"><p>中断データを確認しています。</p></section></main>;
  const canRecover = session?.preserveRecoverableData === true;
  return <main><section className="panel" aria-labelledby="recovery-title"><p className="eyebrow">ClientTalk Coach</p><h1 id="recovery-title">中断データを確認する</h1>{canRecover ? <><p>安全終了した練習があります。自己評価と履歴を確認するか、同じ条件で新しい練習を始められます。</p><div className="practice-controls"><Link className="primary-action" href="/self-review">自己評価へ進む</Link><Link className="secondary-link" href="/setup">同じ条件を参考に新しい練習を設定する</Link><Link className="secondary-link" href="/history">履歴を見る</Link></div></> : <><p>復旧が必要な中断データはありません。</p><Link className="primary-action" href="/history">練習履歴を見る</Link></>}</section></main>;
}

function loadSession(): PracticeSession | null {
  const raw = window.sessionStorage.getItem("client-talk-coach.practice-session");
  return raw ? JSON.parse(raw) as PracticeSession : null;
}
