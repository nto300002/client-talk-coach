"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  clearPracticeSessionStorage,
  deleteSessionScopedStorage,
} from "@/modules/practice-session/infrastructure/session-storage-cleanup";
import {
  IndexedDbRecordingRepository,
  LocalPracticeDatabase,
  type StoredPracticeSession,
} from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";
import type { RecordingMetadata } from "@/modules/local-recording/domain/recording-limit";
import { deletionReasonMessage, filterByScenarioId } from "@/modules/local-recording/domain/practice-history";

type Entry = StoredPracticeSession & {
  recording: RecordingMetadata | undefined;
  previous: StoredPracticeSession | undefined;
  hasAnalysis: boolean;
};

export default function HistoryPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [scenarioFilter, setScenarioFilter] = useState("all");

  const load = useCallback(async () => {
    const repository = new IndexedDbRecordingRepository(new LocalPracticeDatabase());
    const sessions = await repository.listPracticeSessions();
    const loaded = await Promise.all(
      sessions.map(async (session) => ({
        ...session,
        recording: await repository.findLatestRecordingMetadataForSession(session.id),
        previous: await repository.findPreviousMatchingSession(session),
        hasAnalysis: await repository.hasAnalysisForSession(session.id),
      })),
    );
    setEntries(loaded);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function deleteVideo(entry: Entry) {
    if (!entry.recording || !window.confirm("録画のみを削除します。分析と履歴は残ります。")) return;

    const repository = new IndexedDbRecordingRepository(new LocalPracticeDatabase());
    await repository.deleteVideo(entry.recording.id);
    await load();
  }

  async function deleteSession(entry: Entry) {
    if (!window.confirm("この練習履歴と関連データを削除します。元に戻せません。")) return;

    await new IndexedDbRecordingRepository(new LocalPracticeDatabase()).deletePracticeSession(entry.id);
    await deleteSessionScopedStorage(entry.id);
    await load();
  }

  async function deleteAll() {
    if (!window.confirm("すべての端末内データを削除します。元に戻せません。")) return;

    await new IndexedDbRecordingRepository(new LocalPracticeDatabase()).deleteAllData();
    await clearPracticeSessionStorage();
    await load();
  }

  const scenarioIds = [...new Set(entries?.map((entry) => entry.scenarioId) ?? [])].sort();
  const visibleEntries = entries ? filterByScenarioId(entries, scenarioFilter) : undefined;

  return (
    <main>
      <section className="panel" aria-labelledby="history-title">
        <p className="eyebrow">ClientTalk Coach</p>
        <h1 id="history-title">練習履歴</h1>
        {entries?.length ? (
          <label className="history-filter" htmlFor="history-scenario-filter">
            シチュエーションで絞り込む
            <select
              id="history-scenario-filter"
              value={scenarioFilter}
              onChange={(event) => setScenarioFilter(event.target.value)}
            >
              <option value="all">すべてのシチュエーション</option>
              {scenarioIds.map((scenarioId) => <option key={scenarioId} value={scenarioId}>{scenarioId}</option>)}
            </select>
          </label>
        ) : null}
        {entries === null ? <p>履歴を読み込んでいます。</p> : null}
        {entries?.length === 0 ? <p>まだ練習履歴はありません。</p> : null}
        {visibleEntries?.length ? (
          <ul className="history-list">
            {visibleEntries.map((entry) => (
              <li key={entry.id} className="history-entry">
                <h2>{entry.scenarioId}</h2>
                <p>
                  {new Date(entry.createdAt).toLocaleString("ja-JP")} / {entry.sceneId} / 難易度 {entry.difficultyLevel} / {entry.clientTypeId} / {entry.durationMinutes}分
                </p>
                <p>
                  録画: {entry.recording?.status === "completed" ? "保存あり" : "なし"}
                  {entry.recording?.deletionReason
                    ? `（${deletionReasonMessage(entry.recording.deletionReason)}）`
                    : ""}
                </p>
                <p>分析: {entry.hasAnalysis ? "保存あり" : "なし"}</p>
                <p>
                  {entry.previous
                    ? `前回比較: ${new Date(entry.previous.createdAt).toLocaleDateString("ja-JP")}の同条件練習`
                    : "この条件では初回の練習です"}
                </p>
                <div className="practice-controls">
                  {entry.recording?.status === "completed" ? (
                    <button className="secondary-action" type="button" onClick={() => void deleteVideo(entry)}>
                      録画のみ削除
                    </button>
                  ) : null}
                  <button className="destructive-action" type="button" onClick={() => void deleteSession(entry)}>
                    練習履歴を削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {entries?.length && visibleEntries?.length === 0 ? <p>この条件の練習履歴はありません。</p> : null}
        <div className="practice-controls">
          <button className="destructive-action" type="button" onClick={() => void deleteAll()}>
            すべての端末内データを削除
          </button>
          <Link className="secondary-link" href="/setup">
            新しい練習を設定する
          </Link>
        </div>
      </section>
    </main>
  );
}
