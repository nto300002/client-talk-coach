"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  endPracticeWithoutMedia,
  pausePracticeSession,
  resumePracticeSession,
} from "@/modules/practice-session/application/practice-lifecycle";
import type { PracticeSession } from "@/modules/practice-session/domain/practice-session";
import {
  finishMediaPractice,
  getActiveMediaPractice,
  pauseMediaPractice,
  resumeMediaPractice,
} from "@/modules/media/application/media-practice-registry";

const sessionStorageKey = "client-talk-coach.practice-session";

export default function PracticePage() {
  const router = useRouter();
  const [session, setSession] = useState<PracticeSession | null>(getStoredPracticeSession);

  if (!session) {
    return (
      <main>
        <section className="panel" aria-labelledby="practice-missing-title">
          <h1 id="practice-missing-title">練習設定が見つかりません</h1>
          <p>練習設定からもう一度始めてください。</p>
        </section>
      </main>
    );
  }

  const isPaused = session.status === "paused";
  const isRecording = getActiveMediaPractice(session.id) !== null;

  function saveSession(nextSession: PracticeSession) {
    window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
    setSession(nextSession);
  }

  async function endPractice(reason: "user_completed" | "emergency_end") {
    const currentSession = session;
    if (!currentSession) {
      return;
    }

    await finishMediaPractice(currentSession.id);
    const endedSession = await endPracticeWithoutMedia(currentSession, reason);
    saveSession(endedSession);
    router.push("/self-review");
  }

  return (
    <main>
      <section className="panel practice-panel" aria-labelledby="practice-title">
        <p className="eyebrow">ClientTalk Coach</p>
        <h1 id="practice-title">AI顧客との練習</h1>
        <p className="practice-status" aria-live="polite">
          {isPaused ? "一時停止中" : isRecording ? "録画中です" : "会話の準備ができています"}
        </p>
        <p>{session.configuration.durationMinutes}分の練習です。詳細な採点は会話中に表示しません。</p>
        <div className="practice-controls">
          {isPaused ? (
            <button className="primary-action" type="button" onClick={() => {
              void resumeMediaPractice(session.id);
              saveSession(resumePracticeSession(session));
            }}>
              再開する
            </button>
          ) : (
            <button className="secondary-action" type="button" onClick={() => {
              void pauseMediaPractice(session.id);
              saveSession(pausePracticeSession(session));
            }}>
              一時停止する
            </button>
          )}
          <button className="primary-action" type="button" onClick={() => void endPractice("user_completed")}>
            会話を終了する
          </button>
          <button className="text-action" type="button" onClick={() => void endPractice("emergency_end")}>
            安全に終了する
          </button>
        </div>
      </section>
    </main>
  );
}

function getStoredPracticeSession(): PracticeSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.sessionStorage.getItem(sessionStorageKey);
  return stored ? (JSON.parse(stored) as PracticeSession) : null;
}
