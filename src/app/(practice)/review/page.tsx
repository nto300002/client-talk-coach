"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PracticeSession } from "@/modules/practice-session/domain/practice-session";
import { IndexedDbRecordingRepository, LocalPracticeDatabase } from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";
import { retryDurationSeconds, retryTaskFor, sortReviewMarkers, type ReviewMarker } from "@/modules/video-review/domain/video-review";
import { loadPartialRetries, savePartialRetry, type PartialRetry } from "@/modules/video-review/infrastructure/session-storage-retry";

export default function ReviewPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [markers, setMarkers] = useState<ReviewMarker[]>([]);
  const [retries, setRetries] = useState<PartialRetry[]>([]);
  const [session] = useState(getSession);

  useEffect(() => {
    if (!session) return;
    void loadReviewData(session.id).then(({ blob, reviewMarkers, partialRetries }) => {
      if (blob) setVideoUrl(URL.createObjectURL(blob));
      setMarkers(reviewMarkers);
      setRetries(partialRetries);
    });
  }, [session]);

  if (!session) return <main><section className="panel"><h1>振り返りを開始できません</h1><Link className="secondary-link" href="/setup">練習設定へ戻る</Link></section></main>;
  const startRetry = () => {
    const retry: PartialRetry = { id: crypto.randomUUID(), originalSessionId: session.id, category: "structure", durationSeconds: retryDurationSeconds(60), task: retryTaskFor("structure"), createdAt: new Date().toISOString(), completedAt: new Date().toISOString() };
    savePartialRetry(retry); setRetries((current) => [...current, retry]);
  };
  return <main><section className="panel" aria-labelledby="review-title"><p className="eyebrow">ClientTalk Coach</p><h1 id="review-title">録画を振り返る</h1><p>動画を見なくても、マーカーと再練習だけで振り返れます。</p>{videoUrl ? <video ref={videoRef} controls src={videoUrl} aria-label="練習録画" /> : <p role="status">録画は保存されていないか、自動削除されました。分析結果は引き続き確認できます。</p>}<h2>マーカー</h2>{markers.length ? <ul>{markers.map((marker) => <li key={`${marker.category}-${marker.timestampMs}`}><button type="button" onClick={() => { if (videoRef.current) videoRef.current.currentTime = marker.timestampMs / 1_000; }}>{Math.round(marker.timestampMs / 1_000)}秒: {marker.detail}</button></li>)}</ul> : <p>表示できる音声マーカーはまだありません。</p>}<section className="primary-feedback"><h2>短い再練習</h2><p>{retryTaskFor("structure")}</p><button className="primary-action" type="button" onClick={startRetry}>60秒の再練習を完了する</button>{retries.length ? <p role="status">部分再練習: {retries.length}回。元の練習に紐付けて保存しました。</p> : null}</section><Link className="secondary-link" href="/results">結果へ戻る</Link></section></main>;
}

function getSession(): PracticeSession | null { if (typeof window === "undefined") return null; const stored = window.sessionStorage.getItem("client-talk-coach.practice-session"); return stored ? JSON.parse(stored) as PracticeSession : null; }

async function loadReviewData(sessionId: string) {
  const repository = new IndexedDbRecordingRepository(new LocalPracticeDatabase());
  const recording = await repository.findLatestRecordingForSession(sessionId);
  const blob = recording ? await repository.loadRecordingBlob(recording.id) : null;
  const audio = await repository.findAudioAnalysis(sessionId);
  return {
    blob,
    reviewMarkers: sortReviewMarkers((audio?.result.markers ?? []).map((marker) => ({ ...marker, tone: "improvement" }))),
    partialRetries: loadPartialRetries(sessionId),
  };
}
