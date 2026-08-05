"use client";

import { useEffect, useMemo, useState } from "react";

import {
  comparePromptVersions,
  developerFixture,
  duplicateScenario,
  validateScenarioJson,
  type PromptComparisonResult,
  type ExperimentModel,
  type PromptVersion,
  type ScenarioVersion,
} from "@/modules/admin-experiment/domain/admin-experiment";
import { LocalStorageAdminExperimentRepository } from "@/modules/admin-experiment/infrastructure/local-storage-admin-experiment-repository";
import type { ScenarioDefinition } from "@/modules/scenario/domain/scenario-definition";

const initialPrompts: PromptVersion[] = [
  { id: "developer-concise", name: "簡潔な顧客", instruction: "回答は一から三文に抑えてください。", version: 1, savedAt: "developer-fixture" },
  { id: "developer-confirming", name: "確認重視の顧客", instruction: "曖昧な回答には確認質問を一つ返してください。", version: 1, savedAt: "developer-fixture" },
];

const defaultRepository = new LocalStorageAdminExperimentRepository();

type AdminExperimentPanelProps = {
  initialScenario: ScenarioDefinition;
  repository?: AdminExperimentRepository;
};

type AdminExperimentRepository = Pick<
  LocalStorageAdminExperimentRepository,
  "listPromptVersions" | "listScenarioVersions" | "saveScenario" | "savePrompt"
>;

export function AdminExperimentPanel({ initialScenario, repository = defaultRepository }: AdminExperimentPanelProps) {
  const [scenarioJson, setScenarioJson] = useState(() => JSON.stringify(initialScenario, null, 2));
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  const [scenarioVersions, setScenarioVersions] = useState<ScenarioVersion[]>([]);
  const [promptName, setPromptName] = useState(initialPrompts[0].name);
  const [promptInstruction, setPromptInstruction] = useState(initialPrompts[0].instruction);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>(initialPrompts);
  const [comparison, setComparison] = useState<PromptComparisonResult[] | null>(null);
  const [model, setModel] = useState<ExperimentModel>("mock-standard");

  const validation = useMemo(() => validateScenarioJson(scenarioJson), [scenarioJson]);

  useEffect(() => {
    const savedPrompts = repository.listPromptVersions();
    const savedScenarioVersions = repository.listScenarioVersions(initialScenario.id);
    const timer = window.setTimeout(() => {
      if (savedPrompts.length > 0) setPromptVersions(savedPrompts);
      setScenarioVersions(savedScenarioVersions);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialScenario.id, repository]);

  function saveScenario() {
    if (!validation.success) return;
    const version = repository.saveScenario(validation.definition);
    setSavedVersion(version.version);
    setScenarioVersions(repository.listScenarioVersions(validation.definition.id));
  }

  function duplicateCurrentScenario() {
    if (!validation.success) return;
    setScenarioJson(JSON.stringify(duplicateScenario(validation.definition), null, 2));
    setSavedVersion(null);
  }

  function savePrompt() {
    const existing = promptVersions.find((prompt) => prompt.name === promptName);
    const prompt = repository.savePrompt({
      id: existing?.id ?? `developer-prompt-${crypto.randomUUID()}`,
      name: promptName,
      instruction: promptInstruction,
    });
    setPromptVersions((current) => [...current.filter((item) => item.id !== prompt.id), prompt]);
  }

  return (
    <main className="admin-page">
      <section className="panel admin-panel" aria-labelledby="admin-experiment-title">
        <p className="eyebrow">Developer only</p>
        <h1 id="admin-experiment-title">管理者用実験モード</h1>
        <p className="lead">通常の練習履歴、録画、自己評価は読み込みません。開発者が作成した固定フィクスチャだけを使います。</p>

        <section className="admin-section" aria-labelledby="scenario-editor-title">
          <h2 id="scenario-editor-title">シナリオ定義</h2>
          <label htmlFor="scenario-json">Scenario JSON</label>
          <textarea id="scenario-json" value={scenarioJson} onChange={(event) => setScenarioJson(event.target.value)} spellCheck={false} />
          {!validation.success ? (
            <ul className="field-error" aria-live="polite">
              {validation.errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          ) : null}
          <div className="practice-controls">
            <button className="primary-action" type="button" onClick={saveScenario} disabled={!validation.success}>有効な定義を保存</button>
            <button className="secondary-action" type="button" onClick={duplicateCurrentScenario} disabled={!validation.success}>シナリオを複製</button>
          </div>
          {savedVersion ? <p role="status">保存しました: v{savedVersion}。過去の版は端末内に保持されています。</p> : null}
          {scenarioVersions.length > 0 ? (
            <section aria-labelledby="scenario-versions-title">
              <h3 id="scenario-versions-title">保存済みバージョン</h3>
              <ul className="comparison-list">
                {scenarioVersions.map((version) => <li key={version.id}>v{version.version}: {version.definition.shortDescription}</li>)}
              </ul>
            </section>
          ) : null}
        </section>

        <section className="admin-section" aria-labelledby="prompt-editor-title">
          <h2 id="prompt-editor-title">プロンプト版</h2>
          <label htmlFor="prompt-name">プロンプト名</label>
          <input id="prompt-name" value={promptName} onChange={(event) => setPromptName(event.target.value)} />
          <label htmlFor="prompt-instruction">指示文</label>
          <textarea id="prompt-instruction" value={promptInstruction} onChange={(event) => setPromptInstruction(event.target.value)} />
          <label htmlFor="admin-model">会話モデル設定</label>
          <select id="admin-model" value={model} onChange={(event) => setModel(event.target.value as ExperimentModel)}>
            <option value="mock-standard">Mock Standard (固定フィクスチャ比較)</option>
            <option value="mock-strict">Mock Strict (必須質問を厳格に確認)</option>
          </select>
          <div className="practice-controls">
            <button className="secondary-action" type="button" onClick={savePrompt} disabled={!promptName.trim() || !promptInstruction.trim()}>プロンプト版を保存</button>
            <button className="primary-action" type="button" onClick={() => setComparison(comparePromptVersions(promptVersions, developerFixture, model))} disabled={promptVersions.length < 2}>固定フィクスチャで比較</button>
          </div>
          <p className="field-hint">現在の比較設定: {model}。外部AIは呼び出さず、指示文と固定フィクスチャを使う決定的な比較です。</p>
        </section>

        <section className="admin-section" aria-labelledby="comparison-title">
          <h2 id="comparison-title">比較結果</h2>
          <p>入力データ: {developerFixture.label}</p>
          {comparison ? (
            <ul className="comparison-list">
              {comparison.map((result) => <li key={result.promptVersionId}><strong>{result.promptName}</strong> / 評価観点: {result.focus} {result.focusFindingCount}件 / 質問分類 {result.questionCategoryCount}件 / 改善候補 {result.candidateCount}件 / 厳格判定の未確認項目 {result.coverageGapCount}件</li>)}
            </ul>
          ) : <p>二つ以上のプロンプト版を固定フィクスチャへ適用して比較します。</p>}
        </section>
      </section>
    </main>
  );
}
