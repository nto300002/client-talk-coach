# 13. Domainモデル

## 13.1 PracticeSession

```typescript
type PracticeStatus =
  | "setup"
  | "device_check"
  | "ready"
  | "active"
  | "paused"
  | "ending"
  | "post_review"
  | "analyzing"
  | "reviewable"
  | "completed"
  | "recoverable";

type PracticeEndReason =
  | "user_completed"
  | "time_expired"
  | "emergency_end"
  | "provider_failure"
  | "browser_interruption";
```

主な不変条件：

* `active`以外から`paused`へ遷移できない
* `paused`以外から`active`へ再開できない
* 終了イベントは一度だけ処理する
* `completed`後に会話ターンを追加できない
* `emergency_end`でも`post_review`へ進める
* セッション終了後にScenarioStateを変更できない

## 13.2 ScenarioFact状態

```typescript
type FactStatus =
  | "hidden"
  | "eligible"
  | "disclosed"
  | "confirmed";
```

許可する遷移：

```text
hidden → eligible
eligible → disclosed
disclosed → confirmed
```

許可しない遷移：

```text
confirmed → hidden
disclosed → hidden
eligible → hidden
```

同じイベントを複数処理しても状態を重複更新しない。

---

# 14. シナリオエンジン

## 14.1 入力

```typescript
type ScenarioEvent =
  | {
      type: "USER_QUESTION_CLASSIFIED";
      questionCategory: QuestionCategory;
      turnId: string;
    }
  | {
      type: "FOLLOW_UP_QUESTION";
      factId: string;
      turnId: string;
    }
  | {
      type: "FACT_DISCLOSED";
      factId: string;
      turnId: string;
    }
  | {
      type: "FACT_CONFIRMED";
      factId: string;
      turnId: string;
    }
  | {
      type: "AGREEMENT_RECORDED";
      agreement: Agreement;
    }
  | {
      type: "SESSION_ENDED";
    };
```

## 14.2 出力

```typescript
type ScenarioTransitionResult = {
  nextState: ScenarioState;
  newlyEligibleFactIds: string[];
  newlyConfirmedFactIds: string[];
  violations: ScenarioViolation[];
};
```

Scenario Engineは純粋関数として実装する。

```typescript
function transitionScenarioState(
  state: ScenarioState,
  event: ScenarioEvent,
  definition: ScenarioDefinition
): ScenarioTransitionResult;
```

この設計により、APIやIndexedDBなしでUnit Testできる。

---

# 15. フィードバック優先順位

Feedback生成をAIへ丸投げしない。

Domain層で主改善項目を決定し、AIは説明文と再練習文の生成だけを補助する。

優先順位：

```text
1. critical_misunderstanding
2. missing_critical_requirement
3. failure_to_answer
4. missing_agreement
5. unclear_structure
6. selected_focus_skill
7. low_volume
8. long_silence
9. non_verbal_behavior
```

```typescript
type FeedbackCandidate = {
  id: string;
  category: FeedbackCategory;
  severity: number;
  evidenceTurnIds: string[];
  focusSkillRelated: boolean;
};

function selectPrimaryImprovement(
  candidates: FeedbackCandidate[],
  focusSkill: FocusSkill
): FeedbackCandidate;
```

同じ重大度の場合だけ、ユーザーが選択した重点技能を優先する。

最終結果は必ず一つとする。

---
