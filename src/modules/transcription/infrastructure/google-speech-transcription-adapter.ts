import { TranscriptionProviderError, type TranscriptionPort } from "@/modules/transcription/application/process-user-utterance";
import type { TranscriptionInput, TranscriptionResult } from "@/modules/transcription/domain/transcription-contract";
import type { RuntimeEnvironment } from "@/infrastructure/config/runtime-environment";

export class GoogleSpeechTranscriptionAdapter implements TranscriptionPort {
  constructor(
    private readonly config: Extract<RuntimeEnvironment, { mode: "production" }>,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const content = Buffer.from(await input.audio.arrayBuffer()).toString("base64");
      const response = await this.fetcher(
        `https://speech.googleapis.com/v2/projects/${encodeURIComponent(this.config.googleCloudProjectId)}/locations/global/recognizers/_:recognize`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.googleCloudAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            config: { autoDecodingConfig: {}, languageCodes: [input.metadata.locale], model: "short" },
            content,
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        throw response.status === 429
          ? new TranscriptionProviderError("STT_RATE_LIMITED", true)
          : new TranscriptionProviderError("STT_PROVIDER_UNAVAILABLE", response.status >= 500);
      }
      const data = (await response.json()) as { results?: Array<{ alternatives?: Array<{ transcript?: string; confidence?: number }> }> };
      const alternative = data.results?.flatMap((result) => result.alternatives ?? [])[0];
      return {
        utteranceId: input.metadata.utteranceId,
        transcript: alternative?.transcript?.trim() ?? "",
        confidence: alternative?.confidence,
        startedAtMs: input.metadata.startedAtMs,
        endedAtMs: input.metadata.endedAtMs,
        isEmpty: !alternative?.transcript?.trim(),
      };
    } catch (error) {
      if (error instanceof TranscriptionProviderError) {
        throw error;
      }
      throw new TranscriptionProviderError("STT_PROVIDER_TIMEOUT", true);
    } finally {
      clearTimeout(timeout);
    }
  }
}
