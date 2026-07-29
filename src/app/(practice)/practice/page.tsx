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
import { GenerateClientResponse, type GenerateClientResponseOutput } from "@/modules/ai-client/application/generate-client-response";
import { MockAiClientAdapter } from "@/modules/ai-client/infrastructure/mock-ai-client-adapter";
import { BrowserSpeechSynthesisAdapter } from "@/modules/ai-client/infrastructure/browser-speech-synthesis-adapter";
import type { AiClientTurn } from "@/modules/ai-client/domain/ai-client-contract";
import { createScenarioState, type ScenarioState } from "@/modules/scenario/domain/scenario-state";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";
import { saveScenarioState } from "@/modules/scenario-evaluation/infrastructure/session-storage-scenario-state";

const sessionStorageKey = "client-talk-coach.practice-session";

export default function PracticePage() {
  const router = useRouter();
  const [session, setSession] = useState<PracticeSession | null>(getStoredPracticeSession);
  const [draft, setDraft] = useState("");
  const [conversation, setConversation] = useState<ConversationRuntime | null>(() =>
    session ? createConversationRuntime(session) : null,
  );
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [responseGenerator] = useState(
    () => new GenerateClientResponse(new MockAiClientAdapter(), new BrowserSpeechSynthesisAdapter()),
  );

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
    if (conversation) saveScenarioState(currentSession.id, conversation.state);
    const endedSession = await endPracticeWithoutMedia(currentSession, reason);
    saveSession(endedSession);
    router.push("/self-review");
  }

  async function sendUserTurn() {
    const currentSession = session;
    if (!currentSession || !conversation || !draft.trim() || isPaused || isResponding) return;
    const userTurn: AiClientTurn = { id: `turn-${crypto.randomUUID()}`, speaker: "user", text: draft.trim() };
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
      saveScenarioState(currentSession.id, nextConversation.state);
      setConversation(nextConversation);
    } catch {
      setConversationError("AI顧客の応答を取得できませんでした。もう一度お試しください。");
    } finally {
      setIsResponding(false);
    }
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
              <input id="practice-utterance" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={isPaused || isResponding} />
              <button className="secondary-action" type="button" onClick={() => void sendUserTurn()} disabled={!draft.trim() || isPaused || isResponding}>
                {isResponding ? "応答を待っています" : "発話を送る"}
              </button>
            </div>
            {conversationError ? <p className="status-error">{conversationError}</p> : null}
            <p className="conversation-state">開示済み要件: {getDisclosedLabels(conversation).join("、") || "まだありません"}</p>
          </section>
        ) : null}
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

type ConversationRuntime = {
  definition: (typeof technicalMvpScenarioFixtures)[number];
  state: ScenarioState;
  turns: AiClientTurn[];
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
