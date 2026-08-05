"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { PracticeSetupConfiguration } from "@/modules/practice-setup/domain/practice-setup";

const setupKey = "client-talk-coach.practice-setup";

export default function PracticeConfirmationPage() {
  const router = useRouter();
  const [setup, setSetup] = useState<PracticeSetupConfiguration | null | undefined>(undefined);
  useEffect(() => {
    const timer = window.setTimeout(() => setSetup(loadSetup()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (setup === undefined) return <main><section className="panel"><p>練習内容を確認しています。</p></section></main>;
  if (!setup) return <Fallback title="練習設定が見つかりません" />;

  return <main><section className="panel" aria-labelledby="practice-confirm-title"><p className="eyebrow">ClientTalk Coach</p><h1 id="practice-confirm-title">練習内容を確認する</h1><p>難易度 {setup.difficultyLevel} / {setup.durationMinutes}分 / 重点: {setup.focusSkillId}</p><p>録画は端末内へ保存し、音声文字起こしとAI顧客への応答生成に必要なデータだけを外部APIへ送信します。</p><div className="practice-controls"><button className="primary-action" type="button" onClick={() => router.push("/device-check")}>デバイス確認へ進む</button><Link className="secondary-link" href="/setup">設定を変更する</Link><Link className="secondary-link" href="/">キャンセル</Link></div></section></main>;
}

function loadSetup(): PracticeSetupConfiguration | null {
  const raw = window.sessionStorage.getItem(setupKey);
  return raw ? JSON.parse(raw) as PracticeSetupConfiguration : null;
}

function Fallback({ title }: { title: string }) {
  return <main><section className="panel"><h1>{title}</h1><p>練習設定からやり直してください。</p><Link className="primary-action" href="/setup">練習設定へ</Link></section></main>;
}
