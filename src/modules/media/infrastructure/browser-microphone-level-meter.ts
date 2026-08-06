import { createBrowserAudioMonitor } from "@/modules/audio-analysis/infrastructure/browser-audio-monitor";

type MicrophoneCapture = { stop(): void };

type BrowserMicrophoneLevelMeterDependencies = {
  startMonitoring(stream: MediaStream, onLevel: (level: number) => void): MicrophoneCapture;
  schedule(callback: () => void, delayMs: number): number;
  cancelScheduled(timerId: number): void;
};

const measurementDurationMs = 500;

/** Measures a short, local microphone baseline without retaining raw samples. */
export class BrowserMicrophoneLevelMeter {
  constructor(private readonly dependencies: BrowserMicrophoneLevelMeterDependencies) {}

  measure(stream: MediaStream): Promise<number> {
    try {
      const levels: number[] = [];
      const capture = this.dependencies.startMonitoring(stream, (level) => levels.push(level));

      return new Promise((resolve) => {
        const timerId = this.dependencies.schedule(() => {
          capture.stop();
          this.dependencies.cancelScheduled(timerId);
          resolve(average(levels));
        }, measurementDurationMs);
      });
    } catch {
      return Promise.resolve(0);
    }
  }
}

export function createBrowserMicrophoneLevelMeter(): BrowserMicrophoneLevelMeter {
  return new BrowserMicrophoneLevelMeter({
    startMonitoring: (stream, onLevel) => {
      const monitor = createBrowserAudioMonitor().start(stream, (frame) => onLevel(frame.rms));
      return { stop: monitor.stop };
    },
    schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
    cancelScheduled: (timerId) => window.clearTimeout(timerId),
  });
}

function average(levels: readonly number[]): number {
  if (levels.length === 0) {
    return 0;
  }

  return levels.reduce((sum, level) => sum + level, 0) / levels.length;
}
