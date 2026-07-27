import { describe, expect, it, vi } from "vitest";
import { ApplicationError } from "@/domain/errors/application-error";
import { runProviderSmokeTest, safeSmokeError } from "./provider-smoke-test";

describe("runProviderSmokeTest", () => {
  it("does not call external providers in mock mode", async () => {
    const fetcher = vi.fn();

    const results = await runProviderSmokeTest({ mode: "mock" }, fetcher);

    expect(fetcher).not.toHaveBeenCalled();
    expect(results).toEqual([
      expect.objectContaining({ provider: "gemini", status: "skipped" }),
      expect.objectContaining({ provider: "google-speech-to-text", status: "skipped" }),
      expect.objectContaining({ provider: "browser-speech-synthesis", status: "passed" }),
    ]);
  });

  it("uses minimal credential checks without a user conversation payload in production mode", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    const results = await runProviderSmokeTest(
      {
        mode: "production",
        geminiApiKey: "test-key",
        googleCloudProjectId: "project-id",
        googleCloudAccessToken: "access-token",
      },
      fetcher,
    );

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: "gemini", status: "passed" }),
        expect.objectContaining({ provider: "google-speech-to-text", status: "passed" }),
      ]),
    );
    expect(fetcher.mock.calls[0]?.[1]).not.toHaveProperty("body");
    expect(fetcher.mock.calls[1]?.[1]).not.toHaveProperty("body");
  });
});

describe("safeSmokeError", () => {
  it("returns a safe configuration error without secrets", () => {
    const error = new ApplicationError("ENVIRONMENT_CONFIGURATION_INVALID", "Production smoke tests require GEMINI_API_KEY.");

    expect(safeSmokeError(error)).toBe("Production smoke tests require GEMINI_API_KEY.");
  });
});
