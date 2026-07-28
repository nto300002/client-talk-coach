import { calculateRms, type AudioFrame } from "@/modules/audio-analysis/domain/audio-analysis";

type AudioAnalyserLike = {
  fftSize: number;
  getFloatTimeDomainData(samples: Float32Array): void;
  disconnect(): void;
};

type AudioSourceLike = { connect(target: AudioAnalyserLike): void; disconnect(): void };
type AudioContextLike = {
  createMediaStreamSource(stream: MediaStream): AudioSourceLike;
  createAnalyser(): AudioAnalyserLike;
  close(): void;
};

type BrowserAudioMonitorDependencies = {
  createContext(): AudioContextLike;
  requestFrame(callback: (timestampMs: number) => void): number;
  cancelFrame(frameId: number): void;
};

export class BrowserAudioMonitor {
  constructor(private readonly dependencies: BrowserAudioMonitorDependencies) {}

  start(stream: MediaStream, onFrame: (frame: AudioFrame) => void): { stop(): void } {
    const context = this.dependencies.createContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2_048;
    source.connect(analyser);

    let stopped = false;
    let frameId = 0;
    let previousTimestamp: number | null = null;
    const readFrame = (timestampMs: number) => {
      if (stopped) {
        return;
      }
      const samples = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(samples);
      onFrame({
        startMs: timestampMs,
        durationMs: previousTimestamp === null ? 0 : timestampMs - previousTimestamp,
        rms: calculateRms(samples),
      });
      previousTimestamp = timestampMs;
      frameId = this.dependencies.requestFrame(readFrame);
    };
    frameId = this.dependencies.requestFrame(readFrame);

    return {
      stop: () => {
        if (stopped) {
          return;
        }
        stopped = true;
        this.dependencies.cancelFrame(frameId);
        source.disconnect();
        analyser.disconnect();
        context.close();
      },
    };
  }
}

export function createBrowserAudioMonitor(): BrowserAudioMonitor {
  return new BrowserAudioMonitor({
    createContext: () => new AudioContext() as unknown as AudioContextLike,
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (frameId) => window.cancelAnimationFrame(frameId),
  });
}
