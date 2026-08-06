import type { AiClientTurn } from "@/modules/ai-client/domain/ai-client-contract";
import type { TimedInterval } from "@/modules/audio-analysis/domain/audio-analysis";

export function collectPracticeAnalysisInput(input: {
  turns: readonly AiClientTurn[];
  aiSpeechIntervals: readonly TimedInterval[];
}): { transcript: string; aiSpeechIntervals: TimedInterval[] } {
  return {
    transcript: input.turns
      .filter((turn) => turn.speaker === "user")
      .map((turn) => turn.text)
      .join("\n"),
    aiSpeechIntervals: input.aiSpeechIntervals.map((interval) => ({ ...interval })),
  };
}
