import { describe, expect, it } from "vitest";
import { ApplicationError } from "@/domain/errors/application-error";
import { parseRuntimeEnvironment } from "./runtime-environment";

describe("parseRuntimeEnvironment", () => {
  it("accepts local mock mode without provider credentials", () => {
    expect(parseRuntimeEnvironment({ APP_PROVIDER_MODE: "mock" })).toEqual({ mode: "mock" });
  });

  it("defaults to mock mode for local development", () => {
    expect(parseRuntimeEnvironment({})).toEqual({ mode: "mock" });
  });

  it("rejects production configuration without all required credentials", () => {
    expect(() => parseRuntimeEnvironment({ APP_PROVIDER_MODE: "production", GEMINI_API_KEY: "key" })).toThrow(
      ApplicationError,
    );
  });

  it("does not include a secret value in a configuration error", () => {
    const secret = "this-must-not-appear";
    try {
      parseRuntimeEnvironment({ APP_PROVIDER_MODE: "production", GEMINI_API_KEY: secret });
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect((error as Error).message).not.toContain(secret);
    }
  });

  it("requires production credentials for an opt-in production smoke test", () => {
    expect(() => parseRuntimeEnvironment({ APP_PROVIDER_MODE: "mock" }, { requireProductionCredentials: true })).toThrow(
      "Production smoke tests require",
    );
  });
});
