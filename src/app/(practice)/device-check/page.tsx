"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { PracticeSetupConfiguration } from "@/modules/practice-setup/domain/practice-setup";
import { beginPracticeSession } from "@/modules/practice-session/application/practice-lifecycle";

export default function DeviceCheckPage() {
  const router = useRouter();
  const setup = getStoredPracticeSetup();

  function startPractice() {
    if (!setup) {
      return;
    }

    const session = beginPracticeSession(createSessionId(), setup);
    window.sessionStorage.setItem("client-talk-coach.practice-session", JSON.stringify(session));
    router.push("/practice");
  }

  return (
    <main>
      <section className="panel" aria-labelledby="device-check-title">
        <p className="eyebrow">ClientTalk Coach</p>
        <h1 id="device-check-title">カメラとマイクを確認する</h1>
        {setup ? (
          <>
            <p>{setup.durationMinutes}分の練習を開始する前に、カメラとマイクの接続を確認します。</p>
            <p>デバイスの実接続と録画開始は次の実装で追加します。ここでは練習ライフサイクルを確認できます。</p>
            <button className="primary-action" type="button" onClick={startPractice}>
              練習を開始する
            </button>
          </>
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

function createSessionId(): string {
  return `session-${crypto.randomUUID()}`;
}

function getStoredPracticeSetup(): PracticeSetupConfiguration | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.sessionStorage.getItem("client-talk-coach.practice-setup");
  return stored ? (JSON.parse(stored) as PracticeSetupConfiguration) : null;
}
