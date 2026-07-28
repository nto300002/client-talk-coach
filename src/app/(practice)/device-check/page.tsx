"use client";

import Link from "next/link";

import type { PracticeSetupConfiguration } from "@/modules/practice-setup/domain/practice-setup";

export default function DeviceCheckPage() {
  const setup = getStoredPracticeSetup();

  return (
    <main>
      <section className="panel" aria-labelledby="device-check-title">
        <p className="eyebrow">ClientTalk Coach</p>
        <h1 id="device-check-title">カメラとマイクを確認する</h1>
        {setup ? (
          <p>
            {setup.durationMinutes}分の練習を開始する前に、カメラとマイクの接続を確認します。
          </p>
        ) : (
          <p>練習設定が見つかりません。設定画面からやり直してください。</p>
        )}
        <Link className="secondary-link" href="/setup">
          練習設定へ戻る
        </Link>
      </section>
    </main>
  );
}

function getStoredPracticeSetup(): PracticeSetupConfiguration | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.sessionStorage.getItem("client-talk-coach.practice-setup");
  return stored ? (JSON.parse(stored) as PracticeSetupConfiguration) : null;
}
