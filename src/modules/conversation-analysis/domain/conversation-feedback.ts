import type { ScenarioEvaluation } from "@/modules/scenario-evaluation/domain/scenario-evaluation";
import type { AnalysisFinding, ConversationAnalysis } from "./conversation-analysis";

export type ConversationFeedback = {
  strengths: AnalysisFinding[];
  primaryImprovement: {
    category: "missing-requirement" | AnalysisFinding["category"] | "next-practice";
    description: string;
    evidenceId: string;
    retryTask: string;
  };
};

const forbiddenPatterns = [
  /あなたは不安(?:を感じています)?/g,
  /自信度[^。]*。?/g,
  /性格[^。]*。?/g,
  /コミュニケーション能力が低い[^。]*。?/g,
  /信頼されにくい[^。]*。?/g,
];

export function generateConversationFeedback(
  evaluation: ScenarioEvaluation,
  analysis: ConversationAnalysis,
  focusSkillId: string,
): ConversationFeedback {
  const strengths = analysis.strengths.length > 0
    ? analysis.strengths.slice(0, 3).map(sanitizeFinding)
    : evaluation.capturedFacts.slice(0, 2).map((fact) => ({
      id: `captured:${fact.id}`,
      category: "agreement" as const,
      severity: "normal" as const,
      evidenceTurnId: fact.evidenceId ?? `scenario:${fact.id}`,
      description: `「${fact.label}」を会話で扱えています。`,
      retryTask: "次も、確認した内容を短く要約してください。",
    }));

  const critical = evaluation.missingCriticalFacts[0];
  if (critical) {
    return {
      strengths,
      primaryImprovement: {
        category: "missing-requirement",
        description: sanitizeText(`重要な確認項目「${critical.label}」がまだ残っています。`),
        evidenceId: `scenario:${critical.id}`,
        retryTask: `「${critical.label}」について、次の会話で一つ質問してください。`,
      },
    };
  }

  const candidate = chooseCandidate(analysis.candidates, focusSkillId);
  if (candidate) {
    return {
      strengths,
      primaryImprovement: {
        category: candidate.category,
        description: sanitizeText(candidate.description),
        evidenceId: candidate.evidenceTurnId,
        retryTask: sanitizeText(candidate.retryTask),
      },
    };
  }

  return {
    strengths,
    primaryImprovement: {
      category: "next-practice",
      description: "今回の会話を最後まで進められました。次は確認した内容を短くまとめてみましょう。",
      evidenceId: "session",
      retryTask: "会議の最後に、決まったことと次の行動を一文で伝えてください。",
    },
  };
}

export function sanitizeText(text: string) {
  return forbiddenPatterns.reduce((sanitized, pattern) => sanitized.replace(pattern, ""), text).trim() || "次の練習で、会話の流れを一つずつ確認してみましょう。";
}

function sanitizeFinding(finding: AnalysisFinding): AnalysisFinding {
  return { ...finding, description: sanitizeText(finding.description), retryTask: sanitizeText(finding.retryTask) };
}

function chooseCandidate(candidates: AnalysisFinding[], focusSkillId: string) {
  const priority = (candidate: AnalysisFinding) => {
    const focusMatch = focusSkillId === "speak-conclusion-first" && candidate.category === "structure";
    return (candidate.severity === "critical" ? 100 : 0) + (focusMatch ? 10 : 0);
  };
  return [...candidates].sort((left, right) => priority(right) - priority(left))[0];
}
