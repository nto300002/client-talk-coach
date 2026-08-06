import { afterEach, describe, expect, it, vi } from "vitest";

import { BrowserSpeechSynthesisAdapter } from "@/modules/ai-client/infrastructure/browser-speech-synthesis-adapter";

describe("BrowserSpeechSynthesisAdapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reports the actual browser speech start and end interval without retaining audio", async () => {
    let utterance: FakeUtterance | undefined;
    vi.stubGlobal("window", {
      speechSynthesis: {
        cancel: vi.fn(),
        speak: (value: FakeUtterance) => {
          utterance = value;
          value.onstart?.();
          value.onend?.();
        },
      },
    });
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    const onSpeechInterval = vi.fn();
    const adapter = new BrowserSpeechSynthesisAdapter(onSpeechInterval, () => 100);

    await adapter.speak("確認します。");

    expect(utterance?.lang).toBe("ja-JP");
    expect(onSpeechInterval).toHaveBeenCalledWith({ startMs: 100, endMs: 100 });
  });
});

class FakeUtterance {
  lang = "";
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly text: string) {}
}
