import { ApplicationError } from "@/domain/errors/application-error";
import { parseRuntimeEnvironment } from "@/infrastructure/config/runtime-environment";

export type ProviderRuntimeStatus = {
  mode: "mock" | "production";
  message: string;
};

export function getProviderRuntimeStatus(
  environment: NodeJS.ProcessEnv,
): ProviderRuntimeStatus {
  try {
    const config = parseRuntimeEnvironment(environment);
    return config.mode === "mock"
      ? { mode: "mock", message: "Mock AI, STT, and browser TTS are ready. No external API key is used." }
      : { mode: "production", message: "Production provider configuration is available for opt-in smoke tests." };
  } catch (error) {
    if (error instanceof ApplicationError) {
      return { mode: "mock", message: "Provider configuration needs attention. Use mock mode for local development." };
    }
    throw error;
  }
}
