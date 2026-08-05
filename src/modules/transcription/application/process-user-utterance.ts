import {
  emptyTranscription,
  normalizeTranscriptionResponse,
  validateTranscriptionInput,
  type TranscriptionInput,
  type TranscriptionResult,
} from "@/modules/transcription/domain/transcription-contract";
import { ApplicationError } from "@/domain/errors/application-error";

export type TranscriptionPort = {
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
};

export class TranscriptionProviderError extends ApplicationError {
  constructor(
    code: "STT_PROVIDER_TIMEOUT" | "STT_PROVIDER_UNAVAILABLE" | "STT_RATE_LIMITED" | "STT_UNSUPPORTED_MIME",
    readonly retryable: boolean,
  ) {
    super(code, "音声を文字に変換できませんでした。もう一度お試しください。");
    this.name = "TranscriptionProviderError";
  }
}

export type TranscriptTurn = {
  utteranceId: string;
  speaker: "user";
  text: string;
  startedAtMs: number;
  endedAtMs: number;
  confidence?: number;
};

export class ProcessUserUtterance {
  constructor(private readonly transcriptionPort: TranscriptionPort, private readonly maximumAttempts = 3) {}

  async execute(input: TranscriptionInput & { isSpeech: boolean }): Promise<
    | { status: "ignored_silence" }
    | { status: "transcribed"; turn: TranscriptTurn }
    | { status: "empty" }
  > {
    if (!input.isSpeech) {
      return { status: "ignored_silence" };
    }
    const validated = validateTranscriptionInput(input);
    if (validated.audio.size === 0) {
      return { status: "empty" };
    }

    let attempt = 0;
    while (attempt < this.maximumAttempts) {
      try {
        const result = normalizeTranscriptionResponse(await this.transcriptionPort.transcribe(validated));
        return result.isEmpty
          ? { status: "empty" }
          : {
              status: "transcribed",
              turn: {
                utteranceId: result.utteranceId,
                speaker: "user",
                text: result.transcript,
                startedAtMs: result.startedAtMs,
                endedAtMs: result.endedAtMs,
                confidence: result.confidence,
              },
            };
      } catch (error) {
        attempt += 1;
        if (!(error instanceof TranscriptionProviderError) || !error.retryable || attempt >= this.maximumAttempts) {
          throw error;
        }
      }
    }
    throw new TranscriptionProviderError("STT_PROVIDER_UNAVAILABLE", true);
  }
}

export function sanitizeTranscriptionError(_error: unknown): string {
  return "音声を文字に変換できませんでした。もう一度お試しください。";
}

export function createEmptyTranscription(metadata: TranscriptionInput["metadata"]): TranscriptionResult {
  return emptyTranscription(metadata);
}
