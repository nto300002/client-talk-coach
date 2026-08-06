import { describe, expect, it, vi } from "vitest";

import { BrowserMicrophoneLevelMeter } from "@/modules/media/infrastructure/browser-microphone-level-meter";

describe("BrowserMicrophoneLevelMeter", () => {
  it("returns an average RMS baseline and releases the temporary analyser after sampling", async () => {
    const stop = vi.fn();
    let finishSampling: (() => void) | undefined;
    const meter = new BrowserMicrophoneLevelMeter({
      startMonitoring: (_stream, onFrame) => {
        onFrame(0.02);
        onFrame(0.04);
        return { stop };
      },
      schedule: (callback) => {
        finishSampling = callback;
        return 1;
      },
      cancelScheduled: vi.fn(),
    });

    const measurement = meter.measure({} as MediaStream);
    finishSampling?.();

    await expect(measurement).resolves.toBeCloseTo(0.03);
    expect(stop).toHaveBeenCalledOnce();
  });

  it("returns zero when browser audio monitoring cannot start", async () => {
    const meter = new BrowserMicrophoneLevelMeter({
      startMonitoring: () => {
        throw new Error("AudioContext unavailable");
      },
      schedule: vi.fn(),
      cancelScheduled: vi.fn(),
    });

    await expect(meter.measure({} as MediaStream)).resolves.toBe(0);
  });
});
