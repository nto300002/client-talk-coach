"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { RecordingMetadata } from "@/modules/local-recording/domain/recording-limit";
import { deletionReasonMessage } from "@/modules/local-recording/domain/practice-history";
import { IndexedDbRecordingRepository, LocalPracticeDatabase } from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<RecordingMetadata[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const repository = useCallback(() => new IndexedDbRecordingRepository(new LocalPracticeDatabase()), []);
  const load = useCallback(async () => setRecordings(await repository().listRecordings()), [repository]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function toggleFavorite(recording: RecordingMetadata) {
    await repository().setFavorite(recording.id, !recording.isFavorite);
    await load();
  }

  async function deleteSelected() {
    if (!selectedIds.size || !window.confirm(`${selectedIds.size}本の録画のみを削除します。分析と履歴は残ります。`)) return;
    await Promise.all([...selectedIds].map((id) => repository().deleteVideo(id)));
    setSelectedIds(new Set()); await load();
  }

  async function download(recording: RecordingMetadata) {
    const blob = await repository().loadRecordingBlob(recording.id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `${recording.createdAt.slice(0, 10)}-${recording.id}.webm`; link.click();
    URL.revokeObjectURL(url);
  }

  const completed = recordings?.filter((recording) => recording.status === "completed" && recording.deletedAt === null) ?? [];
  return <main><section className="panel" aria-labelledby="recordings-title"><p className="eyebrow">ClientTalk Coach</p><h1 id="recordings-title">録画管理</h1><p>端末内に保存中の録画: {completed.length} / 20本</p>{recordings === null ? <p>録画を読み込んでいます。</p> : null}{recordings?.length === 0 ? <p>保存済みの録画はありません。</p> : null}{recordings?.length ? <ul className="history-list">{recordings.map((recording) => <li key={recording.id} className="history-entry"><label><input type="checkbox" checked={selectedIds.has(recording.id)} disabled={recording.status !== "completed" || recording.deletedAt !== null} onChange={() => setSelectedIds((current) => { const next = new Set(current); next.has(recording.id) ? next.delete(recording.id) : next.add(recording.id); return next; })} /> 選択</label><h2>{new Date(recording.createdAt).toLocaleString("ja-JP")}</h2><p>{recording.status === "completed" && recording.deletedAt === null ? "再生・ダウンロード可能" : deletionReasonMessage(recording.deletionReason)}</p><div className="practice-controls">{recording.status === "completed" && recording.deletedAt === null ? <><button className="secondary-action" type="button" onClick={() => void toggleFavorite(recording)}>{recording.isFavorite ? "お気に入りを解除" : "お気に入りにする"}</button><button className="secondary-action" type="button" onClick={() => void download(recording)}>ダウンロード</button></> : null}</div></li>)}</ul> : null}<div className="practice-controls"><button className="text-action" type="button" disabled={!selectedIds.size} onClick={() => void deleteSelected()}>選択した録画を削除</button><Link className="secondary-link" href="/history">練習履歴を見る</Link></div></section></main>;
}
