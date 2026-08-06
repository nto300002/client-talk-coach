import type { SpeechSynthesisPort } from "@/modules/ai-client/application/generate-client-response";
import type { TimedInterval } from "@/modules/audio-analysis/domain/audio-analysis";

export class BrowserSpeechSynthesisAdapter implements SpeechSynthesisPort {
  constructor(
    private readonly onSpeechInterval: (interval: TimedInterval) => void = () => undefined,
    private readonly now: () => number = () => performance.now(),
  ) {}

  async speak(text: string): Promise<void> {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) throw new Error("Speech synthesis is unavailable.");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    let startedAtMs: number | null = null;
    utterance.onstart = () => {
      startedAtMs = this.now();
    };
    utterance.onend = () => {
      const endedAtMs = this.now();
      this.onSpeechInterval({ startMs: startedAtMs ?? endedAtMs, endMs: endedAtMs });
    };
    utterance.onerror = () => {
      if (startedAtMs !== null) {
        this.onSpeechInterval({ startMs: startedAtMs, endMs: this.now() });
      }
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}
