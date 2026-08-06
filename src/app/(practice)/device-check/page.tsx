"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  classifyDeviceReadiness,
  type DeviceReadiness,
} from "@/modules/media/domain/device-readiness";
import { startMediaPractice } from "@/modules/media/application/media-practice-registry";
import {
  createBrowserMediaFacade,
  type BrowserMediaFacade,
  type MediaPreview,
} from "@/modules/media/infrastructure/browser-media-facade";
import type { PracticeSetupConfiguration } from "@/modules/practice-setup/domain/practice-setup";
import { beginPracticeSession } from "@/modules/practice-session/application/practice-lifecycle";
import { IndexedDbRecordingRepository, LocalPracticeDatabase } from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";

const initialReadiness: DeviceReadiness = { status: "blocked", reasons: ["camera_denied", "microphone_denied"] };

export default function DeviceCheckPage() {
  const router = useRouter();
  const setup = getStoredPracticeSetup();
  const videoRef = useRef<HTMLVideoElement>(null);
  const practiceStartedRef = useRef(false);
  const [media] = useState<BrowserMediaFacade>(() => createBrowserMediaFacade());
  const [preview, setPreview] = useState<MediaPreview | null>(null);
  const [readiness, setReadiness] = useState<DeviceReadiness>(initialReadiness);
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState<boolean | null>(null);
  const [recordingCount, setRecordingCount] = useState<number | null>(null);

  useEffect(() => {
    if (preview && videoRef.current) {
      videoRef.current.srcObject = preview.stream as MediaStream;
    }
  }, [preview]);

  useEffect(() => {
    return () => {
      if (preview && !practiceStartedRef.current) {
        media.stopPreview(preview);
      }
    };
  }, [media, preview]);

  async function requestDevices() {
    setIsRequesting(true);
    setError(null);
    try {
      if (preview) {
        media.stopPreview(preview);
      }
      const nextPreview = await media.requestPreview();
      const hasCapacity = await hasStorageCapacity();
      const nextReadiness = classifyDeviceReadiness({
        cameraGranted: true,
        microphoneGranted: true,
        storageAvailable: hasCapacity,
        recordingSupported: media.supportsRecording(),
        microphoneLevel: nextPreview.microphoneLevel,
      });
      setPreview(nextPreview);
      setReadiness(nextReadiness);
      setStorageAvailable(hasCapacity);
      setRecordingCount(await new IndexedDbRecordingRepository(new LocalPracticeDatabase()).countStoredCompletedRecordings());
    } catch {
      setReadiness({ status: "blocked", reasons: ["camera_denied", "microphone_denied"] });
      setError("カメラまたはマイクを利用できません。ブラウザの許可設定を確認してください。");
    } finally {
      setIsRequesting(false);
    }
  }

  async function startPractice() {
    if (!setup || !preview || readiness.status === "blocked") {
      return;
    }

    setError(null);
    const session = beginPracticeSession(createSessionId(), setup);
    try {
      await startMediaPractice({ sessionId: session.id, preview, media });
      practiceStartedRef.current = true;
      window.sessionStorage.setItem("client-talk-coach.practice-session", JSON.stringify(session));
      router.push("/practice");
    } catch (startError) {
      setError(
        hasErrorCode(startError, "RECORDING_LIMIT_REACHED")
          ? "お気に入りの録画が20本あります。お気に入りを解除または動画を削除してください。"
          : "録画を開始できませんでした。もう一度お試しください。",
      );
    }
  }

  return (
    <main>
      <section className="panel" aria-labelledby="device-check-title">
        <p className="eyebrow">ClientTalk Coach</p>
        <h1 id="device-check-title">カメラとマイクを確認する</h1>
        {setup ? (
          <>
            <p>{setup.durationMinutes}分の練習を開始する前に、録画と会話に必要なデバイスを確認します。</p>
            <div className="device-preview" aria-live="polite">
              {preview ? <video ref={videoRef} autoPlay muted playsInline aria-label="カメラプレビュー" /> : <p>カメラの許可後にプレビューを表示します。</p>}
            </div>
            <ul className="device-status-list">
              <li>カメラ: {preview ? "準備完了" : "未確認"}</li>
              <li>マイク: {preview ? readiness.status === "warning" ? "入力を確認してください" : "準備完了" : "未確認"}</li>
              <li>保存容量: {storageAvailable === null ? "未確認" : storageAvailable ? "録画可能" : "空き容量が不足しています"}</li>
              <li>録画数: {recordingCount === null ? "未確認" : `${recordingCount} / 20`}</li>
              <li>録画: {readiness.status === "blocked" ? "利用できません" : "準備完了"}</li>
            </ul>
            {preview ? <p className="field-hint">普段の声で「本日はお時間をいただき、ありがとうございます」と話して確認してください。</p> : null}
            {readiness.reasons.includes("microphone_level_low") ? (
              <p className="status-warning">マイク入力が小さめです。普段の声で話して確認してください。</p>
            ) : null}
            {error ? <div className="status-error" role="alert"><p>{error}</p>{error.includes("お気に入り") ? <Link className="secondary-link" href="/recordings">録画管理を開く</Link> : null}</div> : null}
            {!preview ? (
              <button className="primary-action" type="button" onClick={() => void requestDevices()} disabled={isRequesting}>
                {isRequesting ? "確認しています" : "カメラとマイクを許可する"}
              </button>
            ) : (
              <div className="practice-controls">
                <button className="secondary-action" type="button" onClick={() => void requestDevices()} disabled={isRequesting}>
                  もう一度確認する
                </button>
                <button className="primary-action" type="button" onClick={() => void startPractice()} disabled={readiness.status === "blocked"}>
                  録画して練習を開始する
                </button>
              </div>
            )}
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

async function hasStorageCapacity(): Promise<boolean> {
  const estimate = await navigator.storage?.estimate?.();
  return estimate?.quota === undefined || estimate.quota - (estimate.usage ?? 0) > 20 * 1024 * 1024;
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}
