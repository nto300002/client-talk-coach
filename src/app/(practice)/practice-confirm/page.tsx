"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { PracticeSetupConfiguration } from "@/modules/practice-setup/domain/practice-setup";
import { focusSkillLabels } from "@/modules/practice-setup/domain/practice-setup";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";

const setupKey = "client-talk-coach.practice-setup";

export default function PracticeConfirmationPage() {
  const router = useRouter();
  const [setup, setSetup] = useState<PracticeSetupConfiguration | null | undefined>(undefined);
  useEffect(() => {
    const timer = window.setTimeout(() => setSetup(loadSetup()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (setup === undefined) return <main><section className="panel"><p>練習内容を確認しています。</p></section></main>;
  if (!setup) return <Fallback title="練習設定が見つかりません" />;

  const summary = buildPracticeConfirmationSummary(setup);
  return <main><section className="panel" aria-labelledby="practice-confirm-title"><p className="eyebrow">ClientTalk Coach</p><h1 id="practice-confirm-title">練習内容を確認する</h1><dl className="practice-summary"><div><dt>シチュエーション</dt><dd>{summary.scenario}</dd></div><div><dt>具体的な場面</dt><dd>{summary.scene}</dd></div><div><dt>難易度</dt><dd>レベル{setup.difficultyLevel}</dd></div><div><dt>顧客タイプ</dt><dd>{summary.clientType}</dd></div><div><dt>重点練習項目</dt><dd>{summary.focusSkill}</dd></div><div><dt>練習時間</dt><dd>{setup.durationMinutes}分</dd></div></dl><p>録画は端末内へ保存し、音声文字起こしとAI顧客への応答生成に必要なデータだけを外部APIへ送信します。</p><div className="practice-controls"><button className="primary-action" type="button" onClick={() => router.push("/device-check")}>デバイス確認へ進む</button><Link className="secondary-link" href="/setup">設定を変更する</Link><Link className="secondary-link" href="/">キャンセル</Link></div></section></main>;
}

export function buildPracticeConfirmationSummary(setup: PracticeSetupConfiguration) {
  const scenario = technicalMvpScenarioFixtures.find((candidate) => candidate.id === setup.scenarioId);
  const scene = scenario?.scenes.find((candidate) => candidate.id === setup.sceneId);
  const clientType = scenario?.clientTypes.find((candidate) => candidate.id === setup.clientTypeId);
  return {
    scenario: scenario?.displayName ?? setup.scenarioId,
    scene: scene?.displayName ?? setup.sceneId,
    clientType: clientType?.displayName ?? setup.clientTypeId,
    focusSkill: focusSkillLabels[setup.focusSkillId],
  };
}

function loadSetup(): PracticeSetupConfiguration | null {
  const raw = window.sessionStorage.getItem(setupKey);
  return raw ? JSON.parse(raw) as PracticeSetupConfiguration : null;
}

function Fallback({ title }: { title: string }) {
  return <main><section className="panel"><h1>{title}</h1><p>練習設定からやり直してください。</p><Link className="primary-action" href="/setup">練習設定へ</Link></section></main>;
}
