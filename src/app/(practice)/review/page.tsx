"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PracticeSession } from "@/modules/practice-session/domain/practice-session";
import { IndexedDbRecordingRepository, LocalPracticeDatabase } from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";
import { markerSeekSeconds, retryDurationSeconds, retryTaskFor, sortReviewMarkers, type ReviewMarker } from "@/modules/video-review/domain/video-review";
import type { PartialRetry } from "@/modules/video-review/infrastructure/session-storage-retry";
import { completePartialRetry, PartialRetryNotFinishedError, remainingPartialRetrySeconds, startPartialRetry } from "@/modules/video-review/domain/partial-retry";
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
  const [now, setNow] = useState(() => new Date());
  const [retryError, setRetryError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!activeRetry) return;
    const intervalId = window.setInterval(() => setNow(new Date()), 250);
    return () => window.clearInterval(intervalId);
  }, [activeRetry]);

  if (!session) return <main><section className="panel"><h1>振り返りを開始できません</h1><Link className="secondary-link" href="/setup">練習設定へ戻る</Link></section></main>;
  const startRetry = async () => {
    const category = feedback?.primaryImprovement.category ?? "next-practice";
    const task = feedback?.primaryImprovement.retryTask ?? retryTaskFor(category);
    const startedAt = new Date();
    const retry = startPartialRetry({ id: crypto.randomUUID(), originalSessionId: session.id, category, durationSeconds: retryDurationSeconds(retryDuration), task, createdAt: startedAt.toISOString() });
    await new IndexedDbRecordingRepository(new LocalPracticeDatabase()).savePartialRetry(retry);
    setRetryResponse(""); setRetryError(null); setNow(startedAt); setActiveRetry(retry); setRetries((current) => [...current, retry]);
  };
  const finishRetry = async () => {
    if (!activeRetry || !retryResponse.trim()) return;
    try {
      const completed = completePartialRetry(activeRetry, new Date().toISOString(), retryResponse);
      await new IndexedDbRecordingRepository(new LocalPracticeDatabase()).savePartialRetry(completed);
      setRetries((current) => current.map((item) => item.id === completed.id ? completed : item));
      setActiveRetry(null);
    } catch (error) {
      setRetryError(error instanceof PartialRetryNotFinishedError ? "再練習が終わるまで保存できません。" : "再練習を保存できませんでした。もう一度お試しください。");
    }
  };
  const seekToMarker = (marker: ReviewMarker) => {
    const video = videoRef.current;
    if (!video) return;
    const durationSeconds = Number.isFinite(video.duration) ? video.duration : marker.timestampMs / 1_000;
    video.currentTime = markerSeekSeconds(marker, durationSeconds);
  };
  const retryTask = feedback?.primaryImprovement.retryTask ?? retryTaskFor("next-practice");
  const latestRetry = [...retries].reverse().find((retry) => retry.status === "completed");
  const retryRemainingSeconds = activeRetry ? remainingPartialRetrySeconds(activeRetry, now) : null;
  const canSaveRetry = retryRemainingSeconds === 0 && retryResponse.trim().length > 0;
  return <main><section className="panel" aria-labelledby="review-title"><p className="eyebrow">ClientTalk Coach</p><h1 id="review-title">録画を振り返る</h1><p>動画を見なくても、マーカーと再練習だけで振り返れます。</p>{videoUrl ? <video ref={videoRef} controls src={videoUrl} aria-label="練習録画" /> : <p role="status">録画は保存されていないか、自動削除されました。分析結果は引き続き確認できます。</p>}<h2>マーカー</h2>{markers.length ? <ul>{markers.map((marker) => <li key={`${marker.category}-${marker.timestampMs}`}><button type="button" className={`review-marker review-marker--${marker.tone}`} onClick={() => seekToMarker(marker)}>{marker.tone === "good" ? "良かった場面" : "改善候補"}: {Math.round(marker.timestampMs / 1_000)}秒: {marker.detail}</button></li>)}</ul> : <p>表示できる音声マーカーはまだありません。</p>}<section className="primary-feedback"><h2>短い再練習</h2><p>{activeRetry?.task ?? retryTask}</p>{activeRetry ? <><p role="status">{retryRemainingSeconds === 0 ? "再練習が終わりました。回答を保存できます。" : `残り ${retryRemainingSeconds ?? activeRetry.durationSeconds}秒。時間終了後に保存できます。`}</p><label>再練習の回答<textarea value={retryResponse} onChange={(event) => { setRetryResponse(event.target.value); setRetryError(null); }} /></label>{retryError ? <p className="status-error" role="alert">{retryError}</p> : null}<button className="primary-action" type="button" onClick={() => void finishRetry()} disabled={!canSaveRetry}>再練習を保存する</button></> : <><label>練習時間<select value={retryDuration} onChange={(event) => setRetryDuration(Number(event.target.value))}><option value={30}>30秒</option><option value={60}>60秒</option><option value={120}>2分</option></select></label><button className="primary-action" type="button" onClick={() => void startRetry()}>{retryDuration}秒の再練習を開始する</button></>}{latestRetry ? <p role="status">部分再練習を保存しました。元の回答 {originalCharacterCount ?? 0}文字 / 再練習 {latestRetry.responseCharacterCount}文字</p> : null}</section><Link className="secondary-link" href="/results">結果へ戻る</Link></section></main>;
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
