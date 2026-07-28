import {
  analyzeAudio,
  type AudioAnalysisInput,
  type AudioAnalysisResult,
} from "@/modules/audio-analysis/domain/audio-analysis";

export type AudioAnalysisPersistencePort = {
  saveAudioAnalysis(analysis: { id: string; sessionId: string; result: AudioAnalysisResult }): Promise<void>;
};

export async function analyzePracticeAudio(
  input: AudioAnalysisInput & { analysisId: string; sessionId: string },
  persistence: AudioAnalysisPersistencePort,
): Promise<AudioAnalysisResult> {
  const result = analyzeAudio(input);
  await persistence.saveAudioAnalysis({ id: input.analysisId, sessionId: input.sessionId, result });
  return result;
}
