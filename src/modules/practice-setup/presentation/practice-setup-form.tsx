"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { StartPracticeSetup } from "@/modules/practice-setup/application/start-practice-setup";
import {
  focusSkillLabels,
  getSceneCompatibleOptions,
  type FocusSkillSelection,
  type PracticeSetupConfiguration,
  type PracticeSetupInput,
  validatePracticeSetup,
} from "@/modules/practice-setup/domain/practice-setup";
import type { ScenarioDefinition } from "@/modules/scenario/domain/scenario-definition";

type PracticeSetupFormProps = {
  scenarios: ScenarioDefinition[];
  onStart?: (configuration: PracticeSetupConfiguration) => void;
};

const durationOptions = [5, 7, 10] as const;

export function PracticeSetupForm({ scenarios, onStart }: PracticeSetupFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<PracticeSetupInput>({ durationMinutes: 7 });
  const [touchedFields, setTouchedFields] = useState<Set<string>>(() => new Set());

  const scenario = scenarios.find((candidate) => candidate.id === draft.scenarioId);
  const sceneOptions = scenario?.scenes ?? [];
  const compatibleOptions = scenario
    ? getSceneCompatibleOptions(scenario, draft.sceneId)
    : { difficultyProfiles: [], clientTypes: [] };
  const validation = scenario ? validatePracticeSetup(draft, scenario) : null;
  const validationErrors = validation && !validation.success ? validation.errors : {};
  const errors = Object.fromEntries(
    Object.entries(validationErrors).filter(([field]) => touchedFields.has(field)),
  );
  const isComplete = validation?.success === true;

  const focusSkills = scenario
    ? scenario.evaluationRubric.focusSkillIds.map((id) => ({
        id,
        label: focusSkillLabels[id as keyof typeof focusSkillLabels] ?? id,
      }))
    : [];

  function selectScenario(scenarioId: string) {
    setTouchedFields(new Set(["scenarioId"]));
    setDraft((current) => ({
      scenarioId,
      sceneId: undefined,
      difficultyLevel: undefined,
      clientTypeId: undefined,
      focusSkillId: undefined,
      durationMinutes: current.durationMinutes ?? 7,
      tensionBefore: current.tensionBefore,
      confidenceBefore: current.confidenceBefore,
    }));
  }

  function selectScene(sceneId: string) {
    setTouchedFields((current) => new Set([...current, "sceneId"]));
    setDraft((current) => ({
      ...current,
      sceneId,
      difficultyLevel: undefined,
      clientTypeId: undefined,
    }));
  }

  function updateAssessment(field: "tensionBefore" | "confidenceBefore", rawValue: string) {
    setTouchedFields((current) => new Set([...current, field]));
    setDraft((current) => ({
      ...current,
      [field]: rawValue === "" ? undefined : Number(rawValue),
    }));
  }

  function handleStart() {
    if (!scenario || !isComplete) {
      return;
    }

    const configuration = new StartPracticeSetup().execute(draft, scenario);
    onStart?.(configuration);

    if (!onStart) {
      window.sessionStorage.setItem("client-talk-coach.practice-setup", JSON.stringify(configuration));
      router.push("/practice-confirm");
    }
  }

  return (
    <form
      className="practice-setup-form"
      onSubmit={(event) => {
        event.preventDefault();
        handleStart();
      }}
    >
      <SelectionGroup title="1. シチュエーション" error={errors.scenarioId}>
        {scenarios.map((item) => (
          <RadioOption
            key={item.id}
            name="scenario"
            value={item.id}
            checked={draft.scenarioId === item.id}
            label={item.displayName}
            description={item.shortDescription}
            onChange={() => selectScenario(item.id)}
          />
        ))}
      </SelectionGroup>

      {scenario ? (
        <SelectionGroup title="2. 具体的な場面" error={errors.sceneId}>
          {sceneOptions.map((item) => (
            <RadioOption
              key={item.id}
              name="scene"
              value={item.id}
              checked={draft.sceneId === item.id}
              label={item.displayName}
              description={item.description}
              onChange={() => selectScene(item.id)}
            />
          ))}
        </SelectionGroup>
      ) : null}

      {draft.sceneId ? (
        <>
          <SelectionGroup title="3. 難易度" error={errors.difficultyLevel}>
            {compatibleOptions.difficultyProfiles.map((item) => (
              <RadioOption
                key={item.level}
                name="difficulty"
                value={String(item.level)}
                checked={draft.difficultyLevel === item.level}
                label={`${item.displayName}（レベル${item.level}）`}
                description={`曖昧さ ${item.ambiguityLevel}/5、想定外の質問 ${item.unexpectedQuestionCount}件`}
                onChange={() => {
                  setTouchedFields((current) => new Set([...current, "difficultyLevel"]));
                  setDraft((current) => ({ ...current, difficultyLevel: item.level }));
                }}
              />
            ))}
          </SelectionGroup>

          <SelectionGroup title="4. 顧客タイプ" error={errors.clientTypeId}>
            {compatibleOptions.clientTypes.map((item) => (
              <RadioOption
                key={item.id}
                name="clientType"
                value={item.id}
                checked={draft.clientTypeId === item.id}
                label={item.displayName}
                description={item.description}
                onChange={() => {
                  setTouchedFields((current) => new Set([...current, "clientTypeId"]));
                  setDraft((current) => ({ ...current, clientTypeId: item.id }));
                }}
              />
            ))}
          </SelectionGroup>

          <SelectionGroup title="5. 今回の重点練習" error={errors.focusSkillId}>
            <RadioOption
              name="focusSkill"
              value="auto"
              checked={draft.focusSkillId === "auto"}
              label="アプリに任せる"
              description="このシチュエーションに合う項目を選びます。"
              onChange={() => {
                setTouchedFields((current) => new Set([...current, "focusSkillId"]));
                setDraft((current) => ({ ...current, focusSkillId: "auto" }));
              }}
            />
            {focusSkills.map((item) => (
              <RadioOption
                key={item.id}
                name="focusSkill"
                value={item.id}
                checked={draft.focusSkillId === item.id}
                label={item.label}
                onChange={() => {
                  setTouchedFields((current) => new Set([...current, "focusSkillId"]));
                  setDraft((current) => ({ ...current, focusSkillId: item.id as FocusSkillSelection }));
                }}
              />
            ))}
          </SelectionGroup>
        </>
      ) : null}

      <SelectionGroup title="6. 練習時間" error={errors.durationMinutes}>
        {durationOptions.map((duration) => (
          <RadioOption
            key={duration}
            name="duration"
            value={String(duration)}
            checked={draft.durationMinutes === duration}
            label={`${duration}分`}
            description={duration === 7 ? "標準の練習時間です。" : undefined}
            onChange={() => {
              setTouchedFields((current) => new Set([...current, "durationMinutes"]));
              setDraft((current) => ({ ...current, durationMinutes: duration }));
            }}
          />
        ))}
      </SelectionGroup>

      <fieldset className="setup-section">
        <legend>7. 今の状態</legend>
        <p className="field-hint">数字は0から10の整数で入力してください。</p>
        <div className="assessment-grid">
          <NumberField
            id="tension-before"
            label="練習前の緊張度"
            value={draft.tensionBefore}
            error={errors.tensionBefore}
            onChange={(value) => updateAssessment("tensionBefore", value)}
          />
          <NumberField
            id="confidence-before"
            label="練習前の自信度"
            value={draft.confidenceBefore}
            error={errors.confidenceBefore}
            onChange={(value) => updateAssessment("confidenceBefore", value)}
          />
        </div>
      </fieldset>

      <div className="setup-actions">
        <button className="primary-action" type="submit" disabled={!isComplete}>
          デバイス確認へ進む
        </button>
        <p>録画は次の画面でカメラとマイクを確認してから開始します。</p>
      </div>
    </form>
  );
}

type SelectionGroupProps = {
  title: string;
  error?: string;
  children: ReactNode;
};

function SelectionGroup({ title, error, children }: SelectionGroupProps) {
  return (
    <fieldset className="setup-section">
      <legend>{title}</legend>
      <div className="option-grid">{children}</div>
      {error ? <p className="field-error">{error}</p> : null}
    </fieldset>
  );
}

type RadioOptionProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  description?: string;
  onChange: () => void;
};

function RadioOption({ name, value, label, checked, description, onChange }: RadioOptionProps) {
  return (
    <label className={`radio-option${checked ? " is-selected" : ""}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} />
      <span>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
    </label>
  );
}

type NumberFieldProps = {
  id: string;
  label: string;
  value: number | undefined;
  error?: string;
  onChange: (value: string) => void;
};

function NumberField({ id, label, value, error, onChange }: NumberFieldProps) {
  return (
    <div className="number-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min="0"
        max="10"
        step="1"
        value={value ?? ""}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
