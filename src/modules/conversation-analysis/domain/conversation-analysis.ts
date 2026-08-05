export type ConversationTurn = {
  id: string;
  speaker: "user" | "client";
  text: string;
};

export type QuestionCategory =
  | "purpose"
  | "current-workflow"
  | "usage-environment"
  | "security"
  | "permission"
  | "budget"
  | "schedule"
  | "agreement";

export type AnalysisFinding = {
  id: string;
  category: "structure" | "technical-term" | "agreement";
  severity: "critical" | "normal";
  evidenceTurnId: string;
  description: string;
  retryTask: string;
};

export type Agreement = {
  responsibleParty: string | null;
  deadline: string | null;
  evidenceTurnId: string;
  text: string;
};

export type ConversationAnalysis = {
  questionCategories: QuestionCategory[];
  strengths: AnalysisFinding[];
  candidates: AnalysisFinding[];
  agreements: Agreement[];
};

const technicalTerms = ["API", "OAuth", "エンドポイント", "非同期", "データベース"];
const conclusionPattern = /^(?:結論(?:から)?[、,:：]?|はい[、,:：]?|いいえ[、,:：]?|可能です|難しいです|現時点では)/;

export function analyzeConversation(turns: ConversationTurn[]): ConversationAnalysis {
  const userTurns = turns.filter((turn) => turn.speaker === "user");
  const questionCategories = unique(userTurns.flatMap((turn) => classifyQuestionCategories(turn.text)));
  const strengths: AnalysisFinding[] = [];
  const candidates: AnalysisFinding[] = [];

  for (const turn of userTurns) {
    if (conclusionPattern.test(turn.text.trim())) {
      strengths.push({
        id: `conclusion-first:${turn.id}`,
        category: "structure",
        severity: "normal",
        evidenceTurnId: turn.id,
        description: "回答の最初に結論を伝えられています。",
        retryTask: "次の回答も、最初の一文で結論を伝えてください。",
      });
    } else if (hasDelayedConclusion(turn.text)) {
      candidates.push({
        id: `delayed-conclusion:${turn.id}`,
        category: "structure",
        severity: "normal",
        evidenceTurnId: turn.id,
        description: "結論に入る前の説明が長くなっています。",
        retryTask: "最初に「可能です」「確認が必要です」などの結論を一文で伝えてください。",
      });
    }

    if (turn.text.length >= 90 && !conclusionPattern.test(turn.text.trim())) {
      candidates.push({
        id: `long-preface:${turn.id}`,
        category: "structure",
        severity: "normal",
        evidenceTurnId: turn.id,
        description: "一度に伝える内容が多く、要点をつかみにくい発言になっています。",
        retryTask: "結論、理由、次の対応の順に三文以内で言い直してみてください。",
      });
    }

    for (const term of technicalTerms) {
      if (turn.text.includes(term) && !isTermExplained(turn.text, term)) {
        candidates.push({
          id: `unexplained-term:${term}:${turn.id}`,
          category: "technical-term",
          severity: "normal",
          evidenceTurnId: turn.id,
          description: `「${term}」を説明なしで使っています。`,
          retryTask: `「${term}」を、相手の業務に結びつく言葉で言い換えてください。`,
        });
      }
    }
  }

  if (questionCategories.length > 0) {
    const firstQuestion = userTurns.find((turn) => classifyQuestionCategories(turn.text).length > 0);
    if (firstQuestion) {
      strengths.push({
        id: `question:${firstQuestion.id}`,
        category: "agreement",
        severity: "normal",
        evidenceTurnId: firstQuestion.id,
        description: "顧客の状況を確認する質問ができています。",
        retryTask: "次も、目的や制約を一つずつ確認してください。",
      });
    }
  }

  const agreements = userTurns.flatMap(extractAgreement);
  if (agreements.length > 0) {
    const agreement = agreements[0];
    strengths.push({
      id: `agreement:${agreement.evidenceTurnId}`,
      category: "agreement",
      severity: "normal",
      evidenceTurnId: agreement.evidenceTurnId,
      description: "次の対応について具体的に確認できています。",
      retryTask: "担当者と期限をセットで確認してください。",
    });
  }

  return { questionCategories, strengths: uniqueById(strengths), candidates: uniqueById(candidates), agreements };
}

export function classifyQuestionCategories(text: string): QuestionCategory[] {
  const categories = new Set<QuestionCategory>();
  if (/(目的|何を改善|課題|なぜ)/.test(text)) categories.add("purpose");
  if (/(現在|業務|Excel|エクセル|運用)/.test(text)) categories.add("current-workflow");
  if (/(スマホ|スマートフォン|端末|外出先|利用者|人数)/.test(text)) categories.add("usage-environment");
  if (/(個人情報|セキュリティ|住所|氏名|データ)/.test(text)) categories.add("security");
  if (/(権限|閲覧|編集|管理者)/.test(text)) categories.add("permission");
  if (/(予算|費用|金額)/.test(text)) categories.add("budget");
  if (/(納期|いつ|期限|日程|まで)/.test(text)) categories.add("schedule");
  if (/(確認|担当|次回|合意)/.test(text)) categories.add("agreement");
  return [...categories];
}

function hasDelayedConclusion(text: string) {
  const trimmed = text.trim();
  return trimmed.length >= 35 && !conclusionPattern.test(trimmed) && /(?:可能です|難しいです|確認が必要です|対応します)/.test(trimmed);
}

function isTermExplained(text: string, term: string) {
  const after = text.slice(text.indexOf(term) + term.length);
  return /(?:とは|という|つまり|接続口|仕組み|意味)/.test(after);
}

function extractAgreement(turn: ConversationTurn): Agreement[] {
  if (!/(?:確認|対応|連絡|共有).*(?:まで|期限|日程)|(?:私|こちら|お客様).*(?:までに|担当)/.test(turn.text)) return [];
  const responsibleParty = /(?:私|こちら)/.test(turn.text) ? "開発側" : /お客様/.test(turn.text) ? "顧客側" : null;
  const deadline = turn.text.match(/(?:明日|今週中|\d{1,2}月\d{1,2}日|\d+日以内)/)?.[0] ?? null;
  return [{ responsibleParty, deadline, evidenceTurnId: turn.id, text: turn.text }];
}

function unique<T>(values: T[]) { return [...new Set(values)]; }
function uniqueById(findings: AnalysisFinding[]) { return Array.from(new Map(findings.map((finding) => [finding.id, finding])).values()); }
