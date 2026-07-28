import { z } from "zod";
import { ApplicationError } from "@/domain/errors/application-error";

const baseSchema = z.object({
  APP_PROVIDER_MODE: z.enum(["mock", "production"]).default("mock"),
});

const productionSchema = baseSchema.extend({
  APP_PROVIDER_MODE: z.literal("production"),
  GEMINI_API_KEY: z.string().min(1),
  GOOGLE_CLOUD_PROJECT_ID: z.string().min(1),
  GOOGLE_CLOUD_ACCESS_TOKEN: z.string().min(1),
});

export type RuntimeEnvironment =
  | { mode: "mock" }
  | {
      mode: "production";
      geminiApiKey: string;
      googleCloudProjectId: string;
      googleCloudAccessToken: string;
    };

export function parseRuntimeEnvironment(
  environment: NodeJS.ProcessEnv,
  options: { requireProductionCredentials?: boolean } = {},
): RuntimeEnvironment {
  const baseResult = baseSchema.safeParse(environment);
  if (!baseResult.success) {
    throw environmentError("APP_PROVIDER_MODE must be either mock or production.");
  }

  const requireCredentials = options.requireProductionCredentials ?? false;
  if (baseResult.data.APP_PROVIDER_MODE === "mock" && !requireCredentials) {
    return { mode: "mock" };
  }

  const productionResult = productionSchema.safeParse({
    ...environment,
    APP_PROVIDER_MODE: "production",
  });
  if (!productionResult.success) {
    throw environmentError(
      "Production smoke tests require GEMINI_API_KEY, GOOGLE_CLOUD_PROJECT_ID, and GOOGLE_CLOUD_ACCESS_TOKEN.",
    );
  }

  return {
    mode: "production",
    geminiApiKey: productionResult.data.GEMINI_API_KEY,
    googleCloudProjectId: productionResult.data.GOOGLE_CLOUD_PROJECT_ID,
    googleCloudAccessToken: productionResult.data.GOOGLE_CLOUD_ACCESS_TOKEN,
  };
}

function environmentError(message: string): ApplicationError {
  return new ApplicationError("ENVIRONMENT_CONFIGURATION_INVALID", message);
}
