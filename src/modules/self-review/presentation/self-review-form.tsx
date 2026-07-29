"use client";

import { useState } from "react";

import { SaveSelfReview } from "@/modules/self-review/application/save-self-review";
import type { SelfReview } from "@/modules/self-review/domain/self-review";

type SelfReviewFormProps = {
  sessionId: string;
  tensionBefore: number;
  confidenceBefore: number;
  saveSelfReview: SaveSelfReview;
  onSaved: (review: SelfReview) => void;
};

export function SelfReviewForm({ sessionId, tensionBefore, confidenceBefore, saveSelfReview, onSaved }: SelfReviewFormProps) {
  const [tensionAfter, setTensionAfter] = useState("");
  const [confidenceAfter, setConfidenceAfter] = useState("");
  const [completedConversation, setCompletedConversation] = useState(false);
  const [askedNeededQuestions, setAskedNeededQuestions] = useState(false);
  const [blankedOut, setBlankedOut] = useState(false);
  const [canTryAgain, setCanTryAgain] = useState(false);
  const [reflection, setReflection] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isScoreValid = (value: string) => /^([0-9]|10)$/.test(value);
  const isComplete = isScoreValid(tensionAfter) && isScoreValid(confidenceAfter) && reflection.length <= 500;

  async function submit() {
    if (!isComplete) return;
    try {
      setError(null);
      const review = await saveSelfReview.execute({
        sessionId, tensionBefore, confidenceBefore, tensionAfter: Number(tensionAfter), confidenceAfter: Number(confidenceAfter),
        completedConversation, askedNeededQuestions, blankedOut, canTryAgain, reflection,
      });
      onSaved(review);
    } catch {
      setError("自己評価を保存できませんでした。入力内容を確認してください。");
    }
  }

  return (
    <form className="self-review-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <div className="assessment-grid">
        <ScoreField label="練習後の緊張度" value={tensionAfter} onChange={setTensionAfter} />
        <ScoreField label="練習後の自信度" value={confidenceAfter} onChange={setConfidenceAfter} />
      </div>
      <fieldset className="setup-section">
        <legend>今回の感覚</legend>
        <label><input type="checkbox" checked={completedConversation} onChange={(event) => setCompletedConversation(event.target.checked)} /> 最後まで話せた</label>
        <label><input type="checkbox" checked={askedNeededQuestions} onChange={(event) => setAskedNeededQuestions(event.target.checked)} /> 聞きたいことを質問できた</label>
        <label><input type="checkbox" checked={blankedOut} onChange={(event) => setBlankedOut(event.target.checked)} /> 頭が真っ白になった場面があった</label>
        <label><input type="checkbox" checked={canTryAgain} onChange={(event) => setCanTryAgain(event.target.checked)} /> もう一度同じ場面を練習できそう</label>
      </fieldset>
      <label className="reflection-field" htmlFor="self-review-reflection">自分で良かったと思う点</label>
      <textarea id="self-review-reflection" maxLength={500} value={reflection} onChange={(event) => setReflection(event.target.value)} />
      <p className="field-hint">{reflection.length}/500</p>
      {error ? <p className="field-error">{error}</p> : null}
      <button className="primary-action" type="submit" disabled={!isComplete}>自己評価を保存する</button>
    </form>
  );
}

function ScoreField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="number-field"><label>{label}<input aria-label={label} inputMode="numeric" value={value} onChange={(event) => onChange(event.target.value)} /></label></div>;
}
