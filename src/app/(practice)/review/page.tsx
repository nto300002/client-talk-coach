"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PracticeSession } from "@/modules/practice-session/domain/practice-session";
import { IndexedDbRecordingRepository, LocalPracticeDatabase } from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";
import { retryDurationSeconds, retryTaskFor, sortReviewMarkers, type ReviewMarker } from "@/modules/video-review/domain/video-review";
import type { PartialRetry } from "@/modules/video-review/infrastructure/session-storage-retry";
import { completePartialRetry, startPartialRetry } from "@/modules/video-review/domain/partial-retry";
import type { ConversationFeedback } from "@/modules/conversation-analysis/domain/conversation-feedback";

export default function ReviewPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [markers, setMarkers] = useState<ReviewMarker[]>([]);
  const [retries, setRetries] = useState<PartialRetry[]>([]);
  const [activeRetry, setActiveRetry] = useState<PartialRetry | null>(null);
  const [feedback, setFeedback] = useState<ConversationFeedback | null>(null);
  const [retryDuration, setRetryDuration] = useState(60);
  const [retryResponse, setRetryResponse] = useState("");
  const [originalCharacterCount, setOriginalCharacterCount] = useState<number | null>(null);
  const [session] = useState(getSession);

  useEffect(() => {
    if (!session) return;
    void loadReviewData(session.id).then(({ blob, reviewMarkers, partialRetries, storedFeedback, originalResponseCharacterCount }) => {
      if (blob) setVideoUrl(URL.createObjectURL(blob));
      setMarkers(reviewMarkers);
      setRetries(partialRetries);
      setFeedback(storedFeedback);
      setOriginalCharacterCount(originalResponseCharacterCount);
    });
  }, [session]);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  if (!session) return <main><section className="panel"><h1>振り返りを開始できません</h1><Link className="secondary-link" href="/setup">練習設定へ戻る</Link></section></main>;
  const startRetry = async () => {
    const category = feedback?.primaryImprovement.category ?? "next-practice";
    const task = feedback?.primaryImprovement.retryTask ?? retryTaskFor(category);
    const retry = startPartialRetry({ id: crypto.randomUUID(), originalSessionId: session.id, category, durationSeconds: retryDurationSeconds(retryDuration), task, createdAt: new Date().toISOString() });
    await new IndexedDbRecordingRepository(new LocalPracticeDatabase()).savePartialRetry(retry);
    setRetryResponse(""); setActiveRetry(retry); setRetries((current) => [...current, retry]);
  };
  const finishRetry = async () => { if (!activeRetry || !retryResponse.trim()) return; const completed = completePartialRetry(activeRetry, new Date().toISOString(), retryResponse); await new IndexedDbRecordingRepository(new LocalPracticeDatabase()).savePartialRetry(completed); setRetries((current) => current.map((item) => item.id === completed.id ? completed : item)); setActiveRetry(null); };
  const retryTask = feedback?.primaryImprovement.retryTask ?? retryTaskFor("next-practice");
  const latestRetry = [...retries].reverse().find((retry) => retry.status === "completed");
  return <main><section className="panel" aria-labelledby="review-title"><p className="eyebrow">ClientTalk Coach</p><h1 id="review-title">録画を振り返る</h1><p>動画を見なくても、マーカーと再練習だけで振り返れます。</p>{videoUrl ? <video ref={videoRef} controls src={videoUrl} aria-label="練習録画" /> : <p role="status">録画は保存されていないか、自動削除されました。分析結果は引き続き確認できます。</p>}<h2>マーカー</h2>{markers.length ? <ul>{markers.map((marker) => <li key={`${marker.category}-${marker.timestampMs}`}><button type="button" onClick={() => { if (videoRef.current) videoRef.current.currentTime = marker.timestampMs / 1_000; }}>{Math.round(marker.timestampMs / 1_000)}秒: {marker.detail}</button></li>)}</ul> : <p>表示できる音声マーカーはまだありません。</p>}<section className="primary-feedback"><h2>短い再練習</h2><p>{activeRetry?.task ?? retryTask}</p>{activeRetry ? <><label>再練習の回答<textarea value={retryResponse} onChange={(event) => setRetryResponse(event.target.value)} /></label><button className="primary-action" type="button" onClick={() => void finishRetry()} disabled={!retryResponse.trim()}>再練習を保存する</button></> : <><label>練習時間<select value={retryDuration} onChange={(event) => setRetryDuration(Number(event.target.value))}><option value={30}>30秒</option><option value={60}>60秒</option><option value={120}>2分</option></select></label><button className="primary-action" type="button" onClick={() => void startRetry()}>{retryDuration}秒の再練習を開始する</button></>}{latestRetry ? <p role="status">部分再練習を保存しました。元の回答 {originalCharacterCount ?? 0}文字 / 再練習 {latestRetry.responseCharacterCount}文字</p> : null}</section><Link className="secondary-link" href="/results">結果へ戻る</Link></section></main>;
}

function getSession(): PracticeSession | null { if (typeof window === "undefined") return null; const stored = window.sessionStorage.getItem("client-talk-coach.practice-session"); return stored ? JSON.parse(stored) as PracticeSession : null; }

async function loadReviewData(sessionId: string) {
  const repository = new IndexedDbRecordingRepository(new LocalPracticeDatabase());
  const [recording, audio, storedFeedback, partialRetries, conversation] = await Promise.all([
    repository.findLatestRecordingForSession(sessionId),
    repository.findAudioAnalysis(sessionId),
    repository.findConversationFeedback(sessionId),
    repository.findPartialRetries(sessionId),
    repository.findConversation(sessionId),
  ]);
  const blob = recording ? await repository.loadRecordingBlob(recording.id) : null;
  return {
    blob,
    reviewMarkers: sortReviewMarkers((audio?.result.markers ?? []).map((marker) => ({ ...marker, tone: "improvement" }))),
    partialRetries,
    storedFeedback,
    originalResponseCharacterCount: [...(conversation?.turns ?? [])].reverse().find((turn) => turn.speaker === "user")?.text.replace(/[\s、。！？]/g, "").length ?? 0,
  };
}
