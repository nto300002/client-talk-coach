"use client";

import { useEffect, useRef, useState } from "react";
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
  getActiveMediaStream,
  pauseMediaPractice,
  resumeMediaPractice,
} from "@/modules/media/application/media-practice-registry";
import { GenerateClientResponse, type GenerateClientResponseOutput } from "@/modules/ai-client/application/generate-client-response";
import { HttpAiClientAdapter } from "@/modules/ai-client/infrastructure/http-ai-client-adapter";
import { BrowserSpeechSynthesisAdapter } from "@/modules/ai-client/infrastructure/browser-speech-synthesis-adapter";
import type { AiClientTurn } from "@/modules/ai-client/domain/ai-client-contract";
import { createScenarioState, type ScenarioState } from "@/modules/scenario/domain/scenario-state";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";
import { HttpTranscriptionAdapter } from "@/modules/transcription/infrastructure/http-transcription-adapter";
import { ProcessUserUtterance } from "@/modules/transcription/application/process-user-utterance";
import { IndexedDbRecordingRepository, LocalPracticeDatabase } from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";
import {
  advancePracticeCountdown,
  createPracticeCountdown,
  formatPracticeCountdown,
  pausePracticeCountdown,
  resumePracticeCountdown,
  type PracticeCountdown,
} from "@/modules/practice-session/domain/practice-countdown";

const sessionStorageKey = "client-talk-coach.practice-session";

export default function PracticePage() {
  const router = useRouter();
  const [session, setSession] = useState<PracticeSession | null>(getStoredPracticeSession);
  const sessionId = session?.id;
  const sessionStatus = session?.status;
  const [draft, setDraft] = useState("");
  const [conversation, setConversation] = useState<ConversationRuntime | null>(() =>
    session ? createConversationRuntime(session) : null,
  );
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [failedUserText, setFailedUserText] = useState<string | null>(null);
  const [failedUtterance, setFailedUtterance] = useState<CapturedUtterance | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [utteranceRecorder, setUtteranceRecorder] = useState<MediaRecorder | null>(null);
  const [countdown, setCountdown] = useState<PracticeCountdown | null>(() =>
    session ? createPracticeCountdown(session.configuration.durationMinutes) : null,
  );
  const [oneMinuteWarningVisible, setOneMinuteWarningVisible] = useState(false);
  const utteranceStartedAt = useRef<number | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const inputLock = useRef(false);
  const sessionRef = useRef(session);
  const conversationRef = useRef(conversation);
  const endingRef = useRef(false);
  const oneMinuteWarningRef = useRef(false);
  const endPracticeRef = useRef<(reason: "user_completed" | "time_expired" | "emergency_end") => Promise<void>>(async () => undefined);
  const [responseGenerator] = useState(
    () => new GenerateClientResponse(new HttpAiClientAdapter(), new BrowserSpeechSynthesisAdapter()),
  );

  sessionRef.current = session;
  conversationRef.current = conversation;

  useEffect(() => {
    if (!sessionId || sessionStatus !== "active") return;

    let lastTickAt = performance.now();
    const intervalId = window.setInterval(() => {
      const now = performance.now();
      const elapsedMs = Math.max(0, Math.floor(now - lastTickAt));
      lastTickAt = now;

      setCountdown((current) => {
        if (!current) return current;
        const result = advancePracticeCountdown(current, elapsedMs);

        if (result.shouldWarnOneMinute && !oneMinuteWarningRef.current) {
          oneMinuteWarningRef.current = true;
          setOneMinuteWarningVisible(true);
        }

        if (result.shouldExpire && !endingRef.current) {
          void endPracticeRef.current("time_expired");
        }

        return result.countdown;
      });
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, [sessionId, sessionStatus]);

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

  async function endPractice(reason: "user_completed" | "time_expired" | "emergency_end") {
    if (endingRef.current) return;
    endingRef.current = true;

    const currentSession = sessionRef.current;
    if (!currentSession) {
      endingRef.current = false;
      return;
    }

    try {
      await finishMediaPractice(currentSession.id);
      await new IndexedDbRecordingRepository(new LocalPracticeDatabase()).savePracticeSession({
        id: currentSession.id,
        createdAt: new Date().toISOString(),
        scenarioId: currentSession.configuration.scenarioId,
        sceneId: currentSession.configuration.sceneId,
        difficultyLevel: currentSession.configuration.difficultyLevel,
        clientTypeId: currentSession.configuration.clientTypeId,
        durationMinutes: currentSession.configuration.durationMinutes,
      });
      const currentConversation = conversationRef.current;
      if (currentConversation) {
        await new IndexedDbRecordingRepository(new LocalPracticeDatabase()).saveConversation(currentSession.id, currentConversation.turns, currentConversation.state);
      }
      const endedSession = await endPracticeWithoutMedia(currentSession, reason);
      saveSession(endedSession);
      router.push("/self-review");
    } catch {
      endingRef.current = false;
      setConversationError("練習を終了できませんでした。もう一度お試しください。");
    }
  }

  endPracticeRef.current = endPractice;

  async function sendUserTurn(transcribedText?: string) {
    const currentSession = session;
    const text = transcribedText ?? draft.trim();
    if (!currentSession || !conversation || !text || isPaused || isResponding || isTranscribing || inputLock.current) return;
    inputLock.current = true;
    const userTurn: AiClientTurn = { id: `turn-${crypto.randomUUID()}`, speaker: "user", text };
    setDraft("");
    setIsResponding(true);
    setConversationError(null);
    try {
      const result = await responseGenerator.execute({
        definition: conversation.definition,
        clientTypeId: currentSession.configuration.clientTypeId,
        difficultyLevel: currentSession.configuration.difficultyLevel,
        state: conversation.state,
        userTurn,
        recentTurns: conversation.turns,
      });
      const nextConversation = toRuntime(conversation, userTurn, result);
      void new IndexedDbRecordingRepository(new LocalPracticeDatabase()).saveConversation(currentSession.id, nextConversation.turns, nextConversation.state);
      setConversation(nextConversation);
      setFailedUserText(null);
    } catch {
      setFailedUserText(text);
      setConversationError("AI顧客の応答を取得できませんでした。もう一度お試しください。");
    } finally {
      setIsResponding(false); inputLock.current = false;
    }
  }

  function toggleVoiceUtterance() {
    if (utteranceRecorder) { utteranceRecorder.stop(); setUtteranceRecorder(null); return; }
    const currentSession = session;
    if (!currentSession) return;
    const stream = getActiveMediaStream(currentSession.id);
    if (!stream) { setConversationError("マイク入力を開始できませんでした。"); return; }
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    if (!mimeType) { setConversationError("このブラウザでは音声文字起こし用の録音形式に対応していません。"); return; }
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => { void transcribeAndSend(new Blob(chunks, { type: mimeType }), utteranceStartedAt.current ?? 0, Math.floor(performance.now())); };
    utteranceStartedAt.current = Math.floor(performance.now());
    recorder.start(); setUtteranceRecorder(recorder);
  }

  async function transcribeAndSend(audio: Blob, startedAtMs: number, endedAtMs: number) {
    const currentSession = session;
    if (!currentSession) return;
    try {
      inputLock.current = true; setIsTranscribing(true); setConversationError(null);
      const result = await new ProcessUserUtterance(new HttpTranscriptionAdapter()).execute({ audio, isSpeech: true, metadata: { sessionId: currentSession.id, utteranceId: crypto.randomUUID(), startedAtMs, endedAtMs: Math.max(endedAtMs, startedAtMs + 1), locale: "ja-JP", mimeType: "audio/webm" } });
      if (result.status === "transcribed") {
        setFailedUtterance(null);
        inputLock.current = false;
        await sendUserTurn(result.turn.text);
      }
    } catch {
      setFailedUtterance({ audio, startedAtMs, endedAtMs });
      setConversationError("音声を文字に変換できませんでした。テキスト入力でも続けられます。");
    }
    finally { setIsTranscribing(false); setIsResponding(false); inputLock.current = false; utteranceStartedAt.current = null; }
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
        {countdown ? (
          <section className="practice-countdown" aria-label="練習時間">
            <p>残り時間: <output data-testid="remaining-time">{formatPracticeCountdown(countdown.remainingMs)}</output></p>
            <p>経過時間: <output data-testid="elapsed-time">{formatPracticeCountdown(countdown.elapsedMs)}</output></p>
            {oneMinuteWarningVisible ? <p className="status-warning" role="alert">終了まで残り1分です。会話をまとめてください。</p> : null}
          </section>
        ) : null}
        {conversation ? (
          <section className="conversation-panel" aria-labelledby="conversation-title">
            <h2 id="conversation-title">顧客との会話</h2>
            <div className="conversation-turns" aria-live="polite">
              {conversation.turns.map((turn) => (
                <p key={turn.id} className={turn.speaker === "client" ? "client-turn" : "user-turn"}>
                  <strong>{turn.speaker === "client" ? "AI顧客" : "あなた"}</strong> {turn.text}
                </p>
              ))}
            </div>
            <label htmlFor="practice-utterance">顧客への発話（テスト入力）</label>
            <div className="conversation-entry">
              <input id="practice-utterance" value={draft} onChange={(event) => { setDraft(event.target.value); setFailedUserText(null); }} disabled={isPaused || isResponding} />
              <button className="secondary-action" type="button" onClick={() => void sendUserTurn()} disabled={!draft.trim() || isPaused || isResponding}>
                {isResponding ? "応答を待っています" : "発話を送る"}
              </button>
            </div>
            <button className="secondary-action" type="button" onClick={toggleVoiceUtterance} disabled={isPaused || isResponding || isTranscribing}>{utteranceRecorder ? "発話を終了して文字起こしする" : "マイクで発話する"}</button>
            {conversationError ? <p className="status-error">{conversationError}</p> : null}
            {failedUserText ? <button className="secondary-action" type="button" onClick={() => void sendUserTurn(failedUserText)} disabled={isPaused || isResponding || isTranscribing}>AI応答を再試行</button> : null}
            {failedUtterance ? <button className="secondary-action" type="button" onClick={() => void transcribeAndSend(failedUtterance.audio, failedUtterance.startedAtMs, failedUtterance.endedAtMs)} disabled={isPaused || isResponding || isTranscribing}>文字起こしを再試行</button> : null}
            <p className="conversation-state">開示済み要件: {getDisclosedLabels(conversation).join("、") || "まだありません"}</p>
          </section>
        ) : null}
        <div className="practice-controls">
          {isPaused ? (
            <button className="primary-action" type="button" onClick={() => {
              void resumeMediaPractice(session.id);
              setCountdown((current) => current ? resumePracticeCountdown(current) : current);
              saveSession(resumePracticeSession(session));
            }}>
              再開する
            </button>
          ) : (
            <button className="secondary-action" type="button" onClick={() => {
              void pauseMediaPractice(session.id);
              setCountdown((current) => current ? pausePracticeCountdown(current) : current);
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

type ConversationRuntime = {
  definition: (typeof technicalMvpScenarioFixtures)[number];
  state: ScenarioState;
  turns: AiClientTurn[];
};

type CapturedUtterance = {
  audio: Blob;
  startedAtMs: number;
  endedAtMs: number;
};

function createConversationRuntime(session: PracticeSession): ConversationRuntime | null {
  const definition = technicalMvpScenarioFixtures.find((scenario) => scenario.id === session.configuration.scenarioId);
  if (!definition) return null;
  const scene = definition.scenes.find((candidate) => candidate.id === session.configuration.sceneId);
  if (!scene) return null;
  return {
    definition,
    state: createScenarioState(definition),
    turns: [{ id: "opening", speaker: "client", text: scene.openingMessage }],
  };
}

function toRuntime(
  runtime: ConversationRuntime,
  userTurn: AiClientTurn,
  result: GenerateClientResponseOutput,
): ConversationRuntime {
  return {
    ...runtime,
    state: result.state,
    turns: [...runtime.turns, userTurn, { id: `client-${userTurn.id}`, speaker: "client", text: result.response.text }],
  };
}

function getDisclosedLabels(runtime: ConversationRuntime) {
  return runtime.definition.facts
    .filter((fact) => ["disclosed", "confirmed"].includes(runtime.state.factStatuses[fact.id]))
    .map((fact) => fact.label);
}

function getStoredPracticeSession(): PracticeSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.sessionStorage.getItem(sessionStorageKey);
  return stored ? (JSON.parse(stored) as PracticeSession) : null;
}
