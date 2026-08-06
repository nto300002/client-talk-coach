import {
  parseScenarioDefinition,
  type DifficultyProfile,
  type ScenarioDefinition,
} from "@/modules/scenario/domain/scenario-definition";

const standardDifficultyProfiles: DifficultyProfile[] = [
  {
    level: 1,
    displayName: "練習",
    hiddenFactRatio: 0.1,
    ambiguityLevel: 1,
    pressureLevel: 0,
    contradictionCount: 0,
    unexpectedQuestionCount: 0,
    responseWaitToleranceSeconds: 45,
    conversationTimeLimitMinutes: 7,
    prohibitedBehaviors: [],
  },
  {
    level: 2,
    displayName: "初級",
    hiddenFactRatio: 0.25,
    ambiguityLevel: 2,
    pressureLevel: 0,
    contradictionCount: 0,
    unexpectedQuestionCount: 1,
    responseWaitToleranceSeconds: 35,
    conversationTimeLimitMinutes: 7,
    prohibitedBehaviors: [],
  },
  {
    level: 3,
    displayName: "標準",
    hiddenFactRatio: 0.45,
    ambiguityLevel: 3,
    pressureLevel: 1,
    contradictionCount: 1,
    unexpectedQuestionCount: 2,
    responseWaitToleranceSeconds: 28,
    conversationTimeLimitMinutes: 7,
    prohibitedBehaviors: [],
  },
  {
    level: 4,
    displayName: "難しい",
    hiddenFactRatio: 0.6,
    ambiguityLevel: 4,
    pressureLevel: 2,
    contradictionCount: 2,
    unexpectedQuestionCount: 3,
    responseWaitToleranceSeconds: 22,
    conversationTimeLimitMinutes: 10,
    prohibitedBehaviors: [],
  },
  {
    level: 5,
    displayName: "実戦",
    hiddenFactRatio: 0.75,
    ambiguityLevel: 5,
    pressureLevel: 3,
    contradictionCount: 3,
    unexpectedQuestionCount: 4,
    responseWaitToleranceSeconds: 18,
    conversationTimeLimitMinutes: 10,
    prohibitedBehaviors: [],
  },
];

const defaultClientTypes = [
  {
    id: "cooperative-client",
    displayName: "協力的な顧客",
    description: "質問に落ち着いて回答し、練習しやすい顧客。",
    cooperationLevel: 5,
    itKnowledgeLevel: 2,
  },
  {
    id: "low-it-knowledge-client",
    displayName: "IT知識が少ない顧客",
    description: "専門用語に弱く、業務の言葉で説明する必要がある顧客。",
    cooperationLevel: 4,
    itKnowledgeLevel: 1,
  },
  {
    id: "deadline-focused-client",
    displayName: "納期重視の顧客",
    description: "納期への関心が強く、影響や代替案を求める顧客。",
    cooperationLevel: 3,
    itKnowledgeLevel: 2,
  },
];

type ScenarioFactSeed = {
  id: string;
  label: string;
  content: string;
  disclosureRule: "initial" | "direct-question" | "deep-question";
  importance: "critical" | "normal";
  expectedQuestionCategories: string[];
};

type StandardScenarioSeed = {
  id: string;
  displayName: string;
  shortDescription: string;
  sceneDisplayName: string;
  sceneDescription: string;
  openingMessage: string;
  practiceGoals: string[];
  facts: ScenarioFactSeed[];
  successConditionIds: string[];
  focusSkillIds: string[];
  allowedClientTypeIds: string[];
};

function createStandardScenario(seed: StandardScenarioSeed): ScenarioDefinition {
  const requiredFactIds = seed.facts.map((fact) => fact.id);
  const criticalFactIds = seed.facts
    .filter((fact) => fact.importance === "critical")
    .map((fact) => fact.id);

  return parseScenarioDefinition({
    id: seed.id,
    version: 1,
    status: "enabled",
    displayName: seed.displayName,
    shortDescription: seed.shortDescription,
    clientTypes: defaultClientTypes,
    facts: seed.facts,
    difficultyProfiles: standardDifficultyProfiles,
    scenes: [
      {
        id: `${seed.id}-scene`,
        version: 1,
        displayName: seed.sceneDisplayName,
        description: seed.sceneDescription,
        practiceGoals: seed.practiceGoals,
        openingMessage: seed.openingMessage,
        requiredFactIds,
        criticalFactIds,
        allowedDifficultyLevels: [1, 2, 3, 4, 5],
        allowedClientTypeIds: seed.allowedClientTypeIds,
      },
    ],
    evaluationRubric: {
      requiredFactIds,
      criticalFactIds,
      successConditionIds: seed.successConditionIds,
      focusSkillIds: seed.focusSkillIds,
    },
  });
}

const additionalTechnicalMvpScenarios: ScenarioDefinition[] = [
  createStandardScenario({
    id: "clarify-vague-request",
    displayName: "曖昧な要望の具体化",
    shortDescription: "使いやすさという曖昧な要望を、業務上の目的と優先順位へ整理する。",
    sceneDisplayName: "使いやすい予約管理画面",
    sceneDescription: "顧客が『予約管理を使いやすくしたい』とだけ相談してくる場面。",
    openingMessage: "今の予約管理画面を、もっと使いやすくしてほしいんです。",
    practiceGoals: ["目的を確認する", "具体例を聞く", "優先順位を整理する"],
    facts: [
      { id: "vague-request-current-workflow", label: "現行の予約手順", content: "電話で受けた予約を担当者が紙へ記入し、後からシステムへ転記している。", disclosureRule: "direct-question", importance: "critical", expectedQuestionCategories: ["current-workflow"] },
      { id: "vague-request-peak-hour", label: "混雑時間帯", content: "平日の午前中に予約が集中し、入力待ちが発生している。", disclosureRule: "deep-question", importance: "normal", expectedQuestionCategories: ["current-workflow"] },
      { id: "vague-request-budget", label: "優先順位の制約", content: "今期は予算が限られるため、最も効果の高い改善から始めたい。", disclosureRule: "direct-question", importance: "critical", expectedQuestionCategories: ["budget"] },
    ],
    successConditionIds: ["clarify-business-goal", "ask-for-example", "prioritize-request"],
    focusSkillIds: ["ask-questions", "summarize-client-needs", "confirm-agreement"],
    allowedClientTypeIds: ["cooperative-client", "low-it-knowledge-client"],
  }),
  createStandardScenario({
    id: "proposal-estimate-explanation",
    displayName: "提案・見積もり説明",
    shortDescription: "提案内容と見積もりの根拠を、顧客の予算と優先順位に合わせて説明する。",
    sceneDisplayName: "受付システムの見積もり説明",
    sceneDescription: "見積金額を提示し、顧客の予算内で優先順位を調整する場面。",
    openingMessage: "見積もりを拝見しましたが、想定より高く感じています。",
    practiceGoals: ["金額の根拠を説明する", "予算を確認する", "代替案を示す"],
    facts: [
      { id: "estimate-required-integration", label: "外部連携の必要性", content: "既存の会計ソフトとのデータ連携を希望している。", disclosureRule: "direct-question", importance: "critical", expectedQuestionCategories: ["current-workflow"] },
      { id: "estimate-budget-cap", label: "予算上限", content: "初期費用は300万円以内に収めたいと考えている。", disclosureRule: "direct-question", importance: "critical", expectedQuestionCategories: ["budget"] },
      { id: "estimate-decision-date", label: "意思決定期限", content: "来月の役員会までに比較材料をそろえる必要がある。", disclosureRule: "deep-question", importance: "normal", expectedQuestionCategories: ["schedule"] },
    ],
    successConditionIds: ["explain-estimate-basis", "confirm-budget", "offer-phased-plan"],
    focusSkillIds: ["speak-conclusion-first", "explain-additional-cost", "set-next-action"],
    allowedClientTypeIds: ["cooperative-client", "low-it-knowledge-client"],
  }),
  createStandardScenario({
    id: "specification-alignment",
    displayName: "仕様確認・認識合わせ",
    shortDescription: "決定済み仕様と未確定事項を整理し、認識違いを責めずに確認する。",
    sceneDisplayName: "権限設定の仕様確認",
    sceneDescription: "顧客が想定していた閲覧範囲と、設計済み仕様に差がある場面。",
    openingMessage: "全員がすべての顧客情報を見られるようにする予定ですよね。",
    practiceGoals: ["現行仕様を確認する", "認識違いを整理する", "保留事項を決める"],
    facts: [
      { id: "alignment-current-permission", label: "現在の権限仕様", content: "一般職員は自部署の顧客情報だけを閲覧できる設計になっている。", disclosureRule: "initial", importance: "critical", expectedQuestionCategories: ["permission"] },
      { id: "alignment-security-policy", label: "社内セキュリティ方針", content: "顧客情報の全社閲覧には情報管理責任者の承認が必要である。", disclosureRule: "direct-question", importance: "critical", expectedQuestionCategories: ["security"] },
      { id: "alignment-review-date", label: "確認会の期限", content: "来週の仕様確認会までに閲覧範囲を決めたい。", disclosureRule: "deep-question", importance: "normal", expectedQuestionCategories: ["schedule"] },
    ],
    successConditionIds: ["state-current-spec", "confirm-misunderstanding", "assign-open-item"],
    focusSkillIds: ["summarize-client-needs", "confirm-agreement", "set-next-action"],
    allowedClientTypeIds: ["cooperative-client", "low-it-knowledge-client"],
  }),
  createStandardScenario({
    id: "progress-reporting",
    displayName: "進捗報告",
    shortDescription: "完了・進行中・課題を分け、顧客側の確認事項と次回報告を合意する。",
    sceneDisplayName: "週次の開発進捗報告",
    sceneDescription: "機能開発は進んでいるが、顧客側の確認待ちが残っている場面。",
    openingMessage: "今週の進捗と、こちらで対応することを教えてください。",
    practiceGoals: ["進捗を構造化する", "課題を共有する", "次回報告を決める"],
    facts: [
      { id: "progress-completed-work", label: "完了機能", content: "利用者登録と検索機能の実装・社内確認は完了している。", disclosureRule: "initial", importance: "normal", expectedQuestionCategories: ["current-workflow"] },
      { id: "progress-client-review", label: "顧客確認待ち", content: "帳票のレイアウトは顧客側の確認を待っている。", disclosureRule: "direct-question", importance: "critical", expectedQuestionCategories: ["current-workflow"] },
      { id: "progress-next-report", label: "次回報告日", content: "次回は来週金曜に進捗を確認したい。", disclosureRule: "deep-question", importance: "normal", expectedQuestionCategories: ["schedule"] },
    ],
    successConditionIds: ["separate-progress-status", "share-risk", "agree-next-report"],
    focusSkillIds: ["speak-conclusion-first", "summarize-client-needs", "set-next-action"],
    allowedClientTypeIds: ["cooperative-client", "deadline-focused-client"],
  }),
  createStandardScenario({
    id: "incident-bug-handling",
    displayName: "障害・不具合対応",
    shortDescription: "原因が確定していない障害を正確に伝え、影響確認と次回連絡を行う。",
    sceneDisplayName: "本番ログイン障害の第一報",
    sceneDescription: "一部ユーザーがログインできない障害について、原因調査中に説明する場面。",
    openingMessage: "今朝からログインできない利用者がいるのですが、何が起きていますか。",
    practiceGoals: ["事実を先に伝える", "影響範囲を確認する", "次回連絡を約束する"],
    facts: [
      { id: "incident-impact", label: "影響範囲", content: "外部認証を利用する一部の利用者がログインできない状態である。", disclosureRule: "initial", importance: "critical", expectedQuestionCategories: ["usage-environment"] },
      { id: "incident-cause-status", label: "原因調査状況", content: "認証サービス側の設定変更との関連を調査中で、原因はまだ確定していない。", disclosureRule: "direct-question", importance: "critical", expectedQuestionCategories: ["security"] },
      { id: "incident-update-time", label: "次回連絡時刻", content: "正午までに調査状況を改めて連絡する予定である。", disclosureRule: "deep-question", importance: "normal", expectedQuestionCategories: ["schedule"] },
    ],
    successConditionIds: ["state-known-facts", "confirm-impact", "set-next-update"],
    focusSkillIds: ["speak-conclusion-first", "apologize-with-action", "set-next-action"],
    allowedClientTypeIds: ["cooperative-client", "deadline-focused-client"],
  }),
  createStandardScenario({
    id: "complaint-handling",
    displayName: "クレーム対応",
    shortDescription: "顧客の不満を受け止め、事実確認と回答期限を整理して対応する。",
    sceneDisplayName: "操作説明不足への不満",
    sceneDescription: "利用開始後、説明を受けていないと顧客から強い不満を受ける場面。",
    openingMessage: "聞いていない操作ばかりで、現場が困っています。どういうことですか。",
    practiceGoals: ["不満を要約する", "事実を確認する", "回答期限を決める"],
    facts: [
      { id: "complaint-training-history", label: "説明会の実施状況", content: "管理者向け説明会は実施したが、一般職員向けの操作説明は未実施だった。", disclosureRule: "direct-question", importance: "critical", expectedQuestionCategories: ["current-workflow"] },
      { id: "complaint-affected-users", label: "影響利用者", content: "新しく配属された一般職員が主に困っている。", disclosureRule: "deep-question", importance: "normal", expectedQuestionCategories: ["usage-environment"] },
      { id: "complaint-response-date", label: "回答希望日", content: "今週中に追加説明の予定を提示してほしい。", disclosureRule: "direct-question", importance: "critical", expectedQuestionCategories: ["schedule"] },
    ],
    successConditionIds: ["acknowledge-concern", "confirm-facts", "set-response-date"],
    focusSkillIds: ["summarize-client-needs", "apologize-with-action", "set-next-action"],
    allowedClientTypeIds: ["cooperative-client", "deadline-focused-client"],
  }),
  createStandardScenario({
    id: "delivery-acceptance-maintenance",
    displayName: "納品・検収・保守",
    shortDescription: "納品範囲、検収条件、保守対象と問い合わせ方法を明確にする。",
    sceneDisplayName: "業務管理システムの納品確認",
    sceneDescription: "納品前に、検収手順と保守範囲を顧客と確認する場面。",
    openingMessage: "納品後に不具合があった場合、どこまで対応してもらえますか。",
    practiceGoals: ["納品範囲を説明する", "検収条件を確認する", "保守窓口を決める"],
    facts: [
      { id: "delivery-included-functions", label: "納品対象機能", content: "契約した利用者管理、検索、帳票出力の三機能が納品対象である。", disclosureRule: "initial", importance: "critical", expectedQuestionCategories: ["current-workflow"] },
      { id: "delivery-acceptance-window", label: "検収期間", content: "納品後10営業日を検収期間とし、重大な不具合は無償で修正する。", disclosureRule: "direct-question", importance: "critical", expectedQuestionCategories: ["schedule"] },
      { id: "delivery-security-contact", label: "緊急連絡先", content: "個人情報に関わる障害は専用の緊急窓口へ連絡する。", disclosureRule: "deep-question", importance: "normal", expectedQuestionCategories: ["security"] },
    ],
    successConditionIds: ["explain-delivery-scope", "confirm-acceptance", "explain-support-contact"],
    focusSkillIds: ["confirm-agreement", "summarize-client-needs", "set-next-action"],
    allowedClientTypeIds: ["cooperative-client", "low-it-knowledge-client"],
  }),
  createStandardScenario({
    id: "meeting-facilitation",
    displayName: "会議運営",
    shortDescription: "複数の論点を整理し、決定事項・保留事項・次の行動を会議の最後に確認する。",
    sceneDisplayName: "論点が混在した定例会議",
    sceneDescription: "顧客が機能要望、予算、納期を一度に話し、会議を整理する必要がある場面。",
    openingMessage: "画面の修正もお願いしたいですし、予算の話と来月の公開日も気になっています。",
    practiceGoals: ["論点を分ける", "優先順位を確認する", "次の行動をまとめる"],
    facts: [
      { id: "meeting-feature-request", label: "画面修正要望", content: "検索画面に担当者名で絞り込む機能を追加したい。", disclosureRule: "direct-question", importance: "normal", expectedQuestionCategories: ["current-workflow"] },
      { id: "meeting-budget-constraint", label: "予算制約", content: "追加対応の予算はまだ確保できていない。", disclosureRule: "direct-question", importance: "critical", expectedQuestionCategories: ["budget"] },
      { id: "meeting-release-date", label: "公開希望日", content: "来月20日の社内説明会までに公開できるか確認したい。", disclosureRule: "deep-question", importance: "critical", expectedQuestionCategories: ["schedule"] },
    ],
    successConditionIds: ["separate-topics", "confirm-priority", "summarize-next-actions"],
    focusSkillIds: ["summarize-client-needs", "confirm-agreement", "set-next-action"],
    allowedClientTypeIds: ["cooperative-client", "deadline-focused-client"],
  }),
];

export const technicalMvpScenarioFixtures: ScenarioDefinition[] = [
  parseScenarioDefinition({
    id: "initial-requirements-interview",
    version: 1,
    status: "enabled",
    displayName: "初回要件ヒアリング",
    shortDescription: "初回相談で目的、現行業務、利用者、納期などを確認する。",
    clientTypes: defaultClientTypes,
    facts: [
      {
        id: "current-excel-workflow",
        label: "現行Excel管理",
        content: "現在はExcelで利用者情報と対応履歴を管理している。",
        disclosureRule: "initial",
        importance: "critical",
        expectedQuestionCategories: ["current-workflow"],
      },
      {
        id: "personal-information",
        label: "個人情報",
        content: "氏名、住所、支援記録などの個人情報を扱う。",
        disclosureRule: "direct-question",
        importance: "critical",
        expectedQuestionCategories: ["security", "data-handling"],
      },
      {
        id: "role-based-permissions",
        label: "権限差",
        content: "管理者と一般職員で閲覧・編集できる範囲が異なる。",
        disclosureRule: "deep-question",
        importance: "critical",
        expectedQuestionCategories: ["permission"],
      },
      {
        id: "mobile-usage",
        label: "スマートフォン利用",
        content: "外出先からスマートフォンで記録を確認したい。",
        disclosureRule: "direct-question",
        importance: "normal",
        expectedQuestionCategories: ["usage-environment"],
      },
    ],
    difficultyProfiles: standardDifficultyProfiles,
    scenes: [
      {
        id: "welfare-office-first-call",
        version: 1,
        displayName: "福祉事業所の初回相談",
        description: "小規模な福祉事業所が業務管理システム化を相談する場面。",
        practiceGoals: ["目的確認", "現行業務確認", "重要要件の確認"],
        openingMessage: "Excel管理をシステム化したいのですが、何から相談すればよいでしょうか。",
        requiredFactIds: ["current-excel-workflow", "personal-information", "mobile-usage"],
        criticalFactIds: ["current-excel-workflow", "personal-information", "role-based-permissions"],
        allowedDifficultyLevels: [1, 2, 3, 4, 5],
        allowedClientTypeIds: ["cooperative-client", "low-it-knowledge-client"],
      },
    ],
    evaluationRubric: {
      requiredFactIds: ["current-excel-workflow", "personal-information", "mobile-usage"],
      criticalFactIds: ["current-excel-workflow", "personal-information", "role-based-permissions"],
      successConditionIds: ["confirm-purpose", "identify-critical-facts", "agree-next-action"],
      focusSkillIds: ["ask-questions", "summarize-client-needs", "confirm-agreement"],
    },
  }),
  ...additionalTechnicalMvpScenarios,
  parseScenarioDefinition({
    id: "scope-change-additional-request",
    version: 1,
    status: "enabled",
    displayName: "仕様変更・追加要望",
    shortDescription: "契約範囲外の追加要望に即答せず、影響確認と回答期限を伝える。",
    clientTypes: defaultClientTypes,
    facts: [
      {
        id: "requested-export-feature",
        label: "追加CSV出力",
        content: "契約範囲外のCSV出力機能を追加したい。",
        disclosureRule: "initial",
        importance: "critical",
        expectedQuestionCategories: ["requested-change"],
      },
      {
        id: "fixed-release-date",
        label: "固定リリース日",
        content: "顧客側の告知済み日程があり、リリース日を変えたくない。",
        disclosureRule: "direct-question",
        importance: "critical",
        expectedQuestionCategories: ["schedule"],
      },
      {
        id: "budget-not-approved",
        label: "追加予算未承認",
        content: "追加費用の社内承認はまだ取れていない。",
        disclosureRule: "deep-question",
        importance: "critical",
        expectedQuestionCategories: ["budget"],
      },
    ],
    difficultyProfiles: standardDifficultyProfiles,
    scenes: [
      {
        id: "csv-export-added-late",
        version: 1,
        displayName: "開発後半のCSV出力追加",
        description: "開発後半で、契約外の機能を納期据え置きで追加したいと言われる場面。",
        practiceGoals: ["即答しない", "影響範囲確認", "回答期限を決める"],
        openingMessage: "このCSV出力くらいなら、今回の範囲で追加できますよね。",
        requiredFactIds: ["requested-export-feature", "fixed-release-date", "budget-not-approved"],
        criticalFactIds: ["requested-export-feature", "fixed-release-date", "budget-not-approved"],
        allowedDifficultyLevels: [1, 2, 3, 4, 5],
        allowedClientTypeIds: ["cooperative-client", "deadline-focused-client"],
      },
    ],
    evaluationRubric: {
      requiredFactIds: ["requested-export-feature", "fixed-release-date", "budget-not-approved"],
      criticalFactIds: ["requested-export-feature", "fixed-release-date", "budget-not-approved"],
      successConditionIds: ["avoid-immediate-promise", "explain-impact-check", "set-response-date"],
      focusSkillIds: ["do-not-answer-immediately", "explain-additional-cost", "set-next-action"],
    },
  }),
  parseScenarioDefinition({
    id: "schedule-delay-explanation",
    version: 1,
    status: "enabled",
    displayName: "納期遅延の説明",
    shortDescription: "遅延を結論から伝え、影響範囲、対応策、新しい期限を説明する。",
    clientTypes: defaultClientTypes,
    facts: [
      {
        id: "delayed-feature",
        label: "遅延対象機能",
        content: "権限管理機能の実装が予定より遅れている。",
        disclosureRule: "initial",
        importance: "critical",
        expectedQuestionCategories: ["delay-target"],
      },
      {
        id: "cause-technical-risk",
        label: "技術的原因",
        content: "既存データの権限ルールに例外が多く、確認が必要になった。",
        disclosureRule: "direct-question",
        importance: "critical",
        expectedQuestionCategories: ["cause"],
      },
      {
        id: "new-deadline",
        label: "新期限",
        content: "追加確認を含め、3営業日の延長が必要。",
        disclosureRule: "deep-question",
        importance: "critical",
        expectedQuestionCategories: ["new-schedule"],
      },
    ],
    difficultyProfiles: standardDifficultyProfiles,
    scenes: [
      {
        id: "permission-feature-delay",
        version: 1,
        displayName: "権限管理機能の遅延報告",
        description: "予定していた権限管理機能が期日までに完了しないことを伝える場面。",
        practiceGoals: ["結論から報告", "原因と対応策の分離", "新期限提示"],
        openingMessage: "本日の進捗報告ですが、予定通り完了していますか。",
        requiredFactIds: ["delayed-feature", "cause-technical-risk", "new-deadline"],
        criticalFactIds: ["delayed-feature", "cause-technical-risk", "new-deadline"],
        allowedDifficultyLevels: [1, 2, 3, 4, 5],
        allowedClientTypeIds: ["cooperative-client", "deadline-focused-client"],
      },
    ],
    evaluationRubric: {
      requiredFactIds: ["delayed-feature", "cause-technical-risk", "new-deadline"],
      criticalFactIds: ["delayed-feature", "cause-technical-risk", "new-deadline"],
      successConditionIds: ["state-delay-first", "separate-cause-action", "offer-new-deadline"],
      focusSkillIds: ["speak-conclusion-first", "apologize-with-action", "confirm-client-concern"],
    },
  }),
  parseScenarioDefinition({
    id: "disabled-demo-scenario",
    version: 1,
    status: "disabled",
    displayName: "Disabled Fixture Scenario",
    shortDescription: "通常選択には表示しない検証用シナリオ。",
    clientTypes: [defaultClientTypes[0]],
    facts: [
      {
        id: "disabled-fact",
        label: "無効fixture",
        content: "表示されないことを確認するための情報。",
        disclosureRule: "initial",
        importance: "normal",
        expectedQuestionCategories: ["disabled"],
      },
    ],
    difficultyProfiles: standardDifficultyProfiles,
    scenes: [
      {
        id: "disabled-scene",
        version: 1,
        displayName: "無効場面",
        description: "通常選択には表示しない場面。",
        practiceGoals: ["表示されないこと"],
        openingMessage: "これは表示されません。",
        requiredFactIds: ["disabled-fact"],
        criticalFactIds: [],
        allowedDifficultyLevels: [1],
        allowedClientTypeIds: ["cooperative-client"],
      },
    ],
    evaluationRubric: {
      requiredFactIds: ["disabled-fact"],
      criticalFactIds: [],
      successConditionIds: ["disabled-success"],
      focusSkillIds: ["disabled-focus"],
    },
  }),
];
