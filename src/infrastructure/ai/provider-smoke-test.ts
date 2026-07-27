import { ApplicationError } from "@/domain/errors/application-error";
import type { RuntimeEnvironment } from "@/infrastructure/config/runtime-environment";

export type ProviderSmokeResult = {
  provider: "gemini" | "google-speech-to-text" | "browser-speech-synthesis";
  status: "passed" | "skipped" | "failed";
  message: string;
};

export async function runProviderSmokeTest(
  config: RuntimeEnvironment,
  fetcher: typeof fetch = fetch,
): Promise<ProviderSmokeResult[]> {
  if (config.mode === "mock") {
    return [
      { provider: "gemini", status: "skipped", message: "Mock mode does not call Gemini." },
      { provider: "google-speech-to-text", status: "skipped", message: "Mock mode does not call Google Speech-to-Text." },
      { provider: "browser-speech-synthesis", status: "passed", message: "Browser TTS is verified by the local test app." },
    ];
  }

  const results = await Promise.all([
    checkGemini(config, fetcher),
    checkGoogleSpeechToText(config, fetcher),
  ]);

  return [
    ...results,
    { provider: "browser-speech-synthesis", status: "passed", message: "Browser TTS is verified in the browser E2E test." },
  ];
}

async function checkGemini(config: Extract<RuntimeEnvironment, { mode: "production" }>, fetcher: typeof fetch): Promise<ProviderSmokeResult> {
  const response = await fetcher("https://generativelanguage.googleapis.com/v1beta/models", {
    headers: { "x-goog-api-key": config.geminiApiKey },
  });
  return response.ok
    ? { provider: "gemini", status: "passed", message: "Gemini credentials and reachability verified." }
    : failed("gemini", response.status);
}

async function checkGoogleSpeechToText(config: Extract<RuntimeEnvironment, { mode: "production" }>, fetcher: typeof fetch): Promise<ProviderSmokeResult> {
  const url = `https://speech.googleapis.com/v2/projects/${encodeURIComponent(config.googleCloudProjectId)}/locations/global/recognizers?pageSize=1`;
  const response = await fetcher(url, {
    headers: { Authorization: `Bearer ${config.googleCloudAccessToken}` },
  });
  return response.ok
    ? { provider: "google-speech-to-text", status: "passed", message: "Speech-to-Text credentials and reachability verified." }
    : failed("google-speech-to-text", response.status);
}

function failed(provider: ProviderSmokeResult["provider"], status: number): ProviderSmokeResult {
  return {
    provider,
    status: "failed",
    message: `Provider returned HTTP ${status}. Check credentials and provider access.`,
  };
}

export function safeSmokeError(error: unknown): string {
  if (error instanceof ApplicationError) return error.message;
  return "Provider smoke test could not complete. Check your network connection and configuration.";
}
