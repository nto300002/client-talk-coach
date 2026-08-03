// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import {
  clearPracticeSessionStorage,
  deleteSessionScopedStorage,
} from "./session-storage-cleanup";

const selfReviewsKey = "client-talk-coach.self-reviews";
const scenarioStatesKey = "client-talk-coach.scenario-states";

describe("session storage cleanup", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("removes all session-scoped data while preserving another session", async () => {
    window.sessionStorage.setItem(selfReviewsKey, JSON.stringify({ "session-a": { sessionId: "session-a" }, "session-b": { sessionId: "session-b" } }));
    window.sessionStorage.setItem(scenarioStatesKey, JSON.stringify({ "session-a": { status: "active" }, "session-b": { status: "active" } }));
    window.sessionStorage.setItem("client-talk-coach.conversation-turns:session-a", "[]");
    window.sessionStorage.setItem("client-talk-coach.conversation-feedback:session-a", "{}");
    window.sessionStorage.setItem("client-talk-coach.retry:session-a", "[]");

    await deleteSessionScopedStorage("session-a");

    expect(window.sessionStorage.getItem("client-talk-coach.conversation-turns:session-a")).toBeNull();
    expect(window.sessionStorage.getItem("client-talk-coach.conversation-feedback:session-a")).toBeNull();
    expect(window.sessionStorage.getItem("client-talk-coach.retry:session-a")).toBeNull();
    expect(JSON.parse(window.sessionStorage.getItem(selfReviewsKey) ?? "{}")).toEqual({ "session-b": { sessionId: "session-b" } });
    expect(JSON.parse(window.sessionStorage.getItem(scenarioStatesKey) ?? "{}")).toEqual({ "session-b": { status: "active" } });
  });

  it("clears every ClientTalk Coach session-storage item", async () => {
    window.sessionStorage.setItem(selfReviewsKey, "{}");
    window.sessionStorage.setItem(scenarioStatesKey, "{}");
    window.sessionStorage.setItem("client-talk-coach.practice-session", "{}");
    window.sessionStorage.setItem("client-talk-coach.practice-setup", "{}");
    window.sessionStorage.setItem("client-talk-coach.conversation-turns:session-a", "[]");

    await clearPracticeSessionStorage();

    expect(window.sessionStorage.length).toBe(0);
  });
});
