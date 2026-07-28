import { describe, expect, it, vi } from "vitest";

import { BrowserAudioMonitor } from "@/modules/audio-analysis/infrastructure/browser-audio-monitor";

describe("BrowserAudioMonitor", () => {
  it("converts browser analyser samples into timestamped local frames and disconnects on stop", () => {
    const disconnect = vi.fn();
    const contextClose = vi.fn();
    const analyser = {
      fftSize: 4,
      getFloatTimeDomainData: (samples: Float32Array) => samples.fill(0.1),
      disconnect,
    };
    const source = { connect: vi.fn(), disconnect };
    const frames: unknown[] = [];
    const monitor = new BrowserAudioMonitor({
      createContext: () => ({
        createMediaStreamSource: () => source,
        createAnalyser: () => analyser,
        close: contextClose,
      }),
      requestFrame: (() => {
        let called = false;
        return (callback) => {
          if (!called) {
            called = true;
            callback(123);
          }
          return 1;
        };
      })(),
      cancelFrame: vi.fn(),
    });

    const capture = monitor.start({} as MediaStream, (frame) => frames.push(frame));
    capture.stop();

    expect(frames).toEqual([expect.objectContaining({ startMs: 123 })]);
    expect((frames[0] as { rms: number }).rms).toBeCloseTo(0.1);
    expect(disconnect).toHaveBeenCalled();
    expect(contextClose).toHaveBeenCalledOnce();
  });
});
