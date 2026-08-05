import type { AudioMarker } from "@/modules/audio-analysis/domain/audio-analysis";

export type ReviewMarker = AudioMarker & { tone: "good" | "improvement" };

export function sortReviewMarkers(markers: ReviewMarker[]): ReviewMarker[] {
  return [...markers].sort((left, right) => left.timestampMs - right.timestampMs || left.category.localeCompare(right.category));
}

export function markerSeekSeconds(marker: ReviewMarker, durationSeconds: number): number {
  return Math.min(Math.max(marker.timestampMs / 1_000, 0), Math.max(durationSeconds, 0));
}

export function retryDurationSeconds(requestedSeconds: number): number {
  return Math.min(120, Math.max(30, requestedSeconds));
}

export function retryTaskFor(category: string): string {
  if (category === "missing-requirement") return "確認漏れの項目を一つ質問してください。";
  if (category === "structure") return "最初の一文で結論を伝えてください。";
  if (category === "technical-term") return "技術用語を相手の業務に結びつく言葉で説明してください。";
  return "決まったことと次の行動を一文で伝えてください。";
}
