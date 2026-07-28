import {
  TranscriptionProviderError,
  type TranscriptionPort,
} from "@/modules/transcription/application/process-user-utterance";
import {
  normalizeTranscriptionResponse,
  type TranscriptionInput,
  type TranscriptionResult,
} from "@/modules/transcription/domain/transcription-contract";

export class HttpTranscriptionAdapter implements TranscriptionPort {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const body = new FormData();
    body.set("audio", input.audio, "utterance.webm");
    body.set("metadata", JSON.stringify(input.metadata));

    let response: Response;
    try {
      response = await this.fetcher(resolveTranscriptionEndpoint(), { method: "POST", body });
    } catch {
      throw new TranscriptionProviderError("STT_PROVIDER_UNAVAILABLE", true);
    }
    if (!response.ok) {
      throw new TranscriptionProviderError(
        response.status === 429 ? "STT_RATE_LIMITED" : "STT_PROVIDER_UNAVAILABLE",
        response.status === 429 || response.status >= 500,
      );
    }
    const bodyJson = (await response.json()) as { data?: unknown };
    return normalizeTranscriptionResponse(bodyJson.data);
  }
}

function resolveTranscriptionEndpoint(): string {
  if (typeof window === "undefined") {
    return "/api/v1/stt/transcriptions";
  }
  return new URL("/api/v1/stt/transcriptions", window.location.origin).toString();
}
