import type { SpeechSynthesisPort } from "@/modules/ai-client/application/generate-client-response";

export class BrowserSpeechSynthesisAdapter implements SpeechSynthesisPort {
  async speak(text: string): Promise<void> {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) throw new Error("Speech synthesis is unavailable.");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}
