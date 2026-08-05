import type { TranscriptionPort } from "@/modules/transcription/application/process-user-utterance";
import { emptyTranscription, type TranscriptionInput, type TranscriptionResult } from "@/modules/transcription/domain/transcription-contract";

export class MockTranscriptionAdapter implements TranscriptionPort {
  constructor(private readonly transcript = "テスト発話を受け取りました") {}

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    if (input.audio.size === 0) {
      return emptyTranscription(input.metadata);
    }
    return {
      utteranceId: input.metadata.utteranceId,
      transcript: this.transcript,
      confidence: 1,
      startedAtMs: input.metadata.startedAtMs,
      endedAtMs: input.metadata.endedAtMs,
      isEmpty: false,
    };
  }
}
