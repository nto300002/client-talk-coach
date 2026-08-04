"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { RecordingLimitReachedError } from "@/modules/local-recording/domain/recording-limit";
import {
  IndexedDbRecordingRepository,
  LocalPracticeDatabase,
} from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";

const databaseName = "client-talk-coach-storage-e2e";

export default function RecordingStorageTestPage() {
  const repositoryRef = useRef<IndexedDbRecordingRepository | null>(null);
  const [count, setCount] = useState(0);
  const [oldestStatus, setOldestStatus] = useState<string | null>(null);
  const [analysisKept, setAnalysisKept] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const repository = () => {
    if (!repositoryRef.current) {
      repositoryRef.current = new IndexedDbRecordingRepository(new LocalPracticeDatabase(databaseName));
    }
    return repositoryRef.current;
  };

  const refresh = useCallback(async () => {
    const currentRepository = repository();
    setCount(await currentRepository.countStoredCompletedRecordings());
    const oldest = await currentRepository.findRecording("recording-00");
    const analysis = await currentRepository.findAnalysis("analysis-00");
    setOldestStatus(oldest?.deletionReason ?? null);
    setAnalysisKept(Boolean(analysis));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function seedRecordings() {
    const currentRepository = repository();
    await currentRepository.deleteAllData();

    for (let index = 0; index < 20; index += 1) {
      const id = `recording-${String(index).padStart(2, "0")}`;
      await currentRepository.saveCompletedRecording(createRecording(id, index), [createChunk(id)]);
    }

    await currentRepository.savePracticeSession({ id: "session-recording-00", createdAt: "2026-07-01T00:00:00.000Z" });
    await currentRepository.saveAnalysis({ id: "analysis-00", sessionId: "session-recording-00" });
    setMessage(null);
    await refresh();
  }

  async function saveTwentyFirst() {
    await repository().saveCompletedRecording(createRecording("recording-20", 20), [createChunk("recording-20")]);
    await refresh();
  }

  async function failTwentyFirstSave() {
    try {
      await repository().saveCompletedRecording(createRecording("recording-failed", 20), [{
        ...createChunk("recording-failed"),
        id: undefined as unknown as string,
      }]);
    } catch {
      setMessage("21本目の保存に失敗しました。既存録画は保持されています");
    }
    await refresh();
  }

  async function favoriteAll() {
    const currentRepository = repository();
    for (let index = 1; index <= 20; index += 1) {
      await currentRepository.setFavorite(`recording-${String(index).padStart(2, "0")}`, true);
    }
    setMessage("20件をすべてお気に入りにしました");
    await refresh();
  }

  async function tryStartRecording() {
    try {
      await repository().assertCanStartNewRecording();
      setMessage("録画を開始できます");
    } catch (error) {
      setMessage(
        error instanceof RecordingLimitReachedError
          ? "お気に入りを解除または動画を削除してください"
          : "録画の開始を確認できませんでした",
      );
    }
  }

  return (
    <main>
      <section className="panel" aria-labelledby="recording-storage-title">
        <p className="eyebrow">ClientTalk Coach</p>
        <h1 id="recording-storage-title">録画保存の検証</h1>
        <p>保存済み録画: {count} / 20</p>
        <div className="practice-controls">
          <button className="secondary-action" type="button" onClick={() => void seedRecordings()}>
            20件の録画を作成
          </button>
          <button className="primary-action" type="button" onClick={() => void saveTwentyFirst()}>
            21本目を保存
          </button>
          <button className="secondary-action" type="button" onClick={() => void failTwentyFirstSave()}>
            失敗する21本目を保存
          </button>
          <button className="secondary-action" type="button" onClick={() => void favoriteAll()}>
            20件をすべてお気に入りにする
          </button>
          <button className="text-action" type="button" onClick={() => void tryStartRecording()}>
            録画を開始する
          </button>
        </div>
        {oldestStatus === "recording_limit" ? (
          <p>recording-00: 保存上限により自動削除されました</p>
        ) : null}
        {analysisKept ? <p>recording-00 の分析結果は保持されています</p> : null}
        {message ? <p role="status">{message}</p> : null}
      </section>
    </main>
  );
}

function createRecording(id: string, index: number) {
  return {
    id,
    sessionId: `session-${id}`,
    createdAt: `2026-07-${String(Math.min(index + 1, 28)).padStart(2, "0")}T00:00:00.000Z`,
    deletedAt: null,
    deletionReason: null,
    isFavorite: false,
    status: "completed" as const,
  };
}

function createChunk(recordingId: string) {
  return {
    id: `chunk-${recordingId}`,
    recordingId,
    sequence: 0,
    createdAt: "2026-07-01T00:00:00.000Z",
    blob: new Blob(["recording"], { type: "video/webm" }),
  };
}
