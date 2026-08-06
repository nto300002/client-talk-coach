import { describe, expect, it } from "vitest";

import { collectPracticeAnalysisInput } from "@/modules/audio-analysis/application/practice-analysis-input";

describe("collectPracticeAnalysisInput", () => {
  it("keeps only user turns in their original order and copies AI speech intervals", () => {
    expect(
      collectPracticeAnalysisInput({
        turns: [
          { id: "opening", speaker: "client", text: "ご相談があります。" },
          { id: "user-1", speaker: "user", text: "あの、現在の業務を教えてください。" },
          { id: "client-1", speaker: "client", text: "Excelです。" },
          { id: "user-2", speaker: "user", text: "利用人数は何人ですか？" },
        ],
        aiSpeechIntervals: [{ startMs: 20, endMs: 40 }],
      }),
    ).toEqual({
      transcript: "あの、現在の業務を教えてください。\n利用人数は何人ですか？",
      aiSpeechIntervals: [{ startMs: 20, endMs: 40 }],
    });
  });
});
