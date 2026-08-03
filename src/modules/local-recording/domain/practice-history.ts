import type { RecordingDeletionReason } from "./recording-limit";

export type PracticeHistoryCondition = {
  scenarioId: string;
  sceneId: string;
  difficultyLevel: number;
  clientTypeId: string;
};

export function hasSamePracticeCondition(
  left: PracticeHistoryCondition,
  right: PracticeHistoryCondition,
): boolean {
  return left.scenarioId === right.scenarioId
    && left.sceneId === right.sceneId
    && left.difficultyLevel === right.difficultyLevel
    && left.clientTypeId === right.clientTypeId;
}

export function deletionReasonMessage(reason: RecordingDeletionReason): string | null {
  switch (reason) {
    case "manual":
      return "手動で削除しました";
    case "retention_expired":
      return "保存期限により自動削除されました";
    case "recording_limit":
      return "録画は保存上限により自動削除されました";
    default:
      return null;
  }
}

export function filterByScenarioId<T extends { scenarioId: string }>(
  entries: T[],
  scenarioId: string,
): T[] {
  return scenarioId === "all" ? entries : entries.filter((entry) => entry.scenarioId === scenarioId);
}
