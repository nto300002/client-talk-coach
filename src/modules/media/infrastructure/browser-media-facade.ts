import { ApplicationError } from "@/domain/errors/application-error";
import { createBrowserMicrophoneLevelMeter } from "@/modules/media/infrastructure/browser-microphone-level-meter";

export type MediaStreamTrackLike = { stop(): void };
export type MediaStreamLike = { getTracks(): MediaStreamTrackLike[] };

export interface MediaRecorderLike {
  state: "inactive" | "recording" | "paused";
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: ((event: { error: Error }) => void) | null;
  start(timeslice?: number): void;
  pause(): void;
  resume(): void;
  stop(): void;
}

export type BrowserMediaDependencies = {
  requestUserMedia(constraints: MediaStreamConstraints): Promise<MediaStreamLike>;
  createRecorder(stream: MediaStreamLike, options: { mimeType: string }): MediaRecorderLike;
  isTypeSupported(mimeType: string): boolean;
  getMicrophoneLevel(stream: MediaStreamLike): Promise<number>;
  now?(): string;
};

export type MediaPreview = { stream: MediaStreamLike; microphoneLevel: number };

export type RecordedChunk = { sequence: number; blob: Blob; createdAt: string };
export type RecordingResult = {
  status: "completed" | "recoverable";
  recordingId: string;
  chunks: RecordedChunk[];
  blob: Blob;
};

export class RecordingAlreadyStartedError extends ApplicationError {
  constructor() {
    super("RECORDING_ALREADY_STARTED", "A recording is already active.");
    this.name = "RecordingAlreadyStartedError";
  }
}

export class BrowserMediaFacade {
  private activeRecording: BrowserRecording | null = null;

  constructor(private readonly dependencies: BrowserMediaDependencies) {}

  async requestPreview(): Promise<MediaPreview> {
    const stream = await this.dependencies.requestUserMedia({ video: true, audio: true });
    return { stream, microphoneLevel: await this.dependencies.getMicrophoneLevel(stream) };
  }

  stopPreview(preview: MediaPreview): void {
    preview.stream.getTracks().forEach((track) => track.stop());
  }

  supportsRecording(): boolean {
    return this.dependencies.isTypeSupported(selectRecordingMimeType(this.dependencies.isTypeSupported));
  }

  startRecording(input: {
    recordingId: string;
    stream: MediaStreamLike;
    onChunk?: (chunk: RecordedChunk) => void | Promise<void>;
  }): BrowserRecording {
    if (this.activeRecording) {
      throw new RecordingAlreadyStartedError();
    }

    const recording = new BrowserRecording(
      input.recordingId,
      this.dependencies.createRecorder(input.stream, {
        mimeType: selectRecordingMimeType(this.dependencies.isTypeSupported),
      }),
      this.dependencies.now ?? (() => new Date().toISOString()),
      () => {
        this.activeRecording = null;
      },
      input.onChunk,
    );
    this.activeRecording = recording;
    recording.start();
    return recording;
  }
}

export class BrowserRecording {
  readonly finished: Promise<RecordingResult>;
  private readonly chunks: RecordedChunk[] = [];
  private readonly pendingChunkWrites: Promise<void>[] = [];
  private resolveFinished!: (result: RecordingResult) => void;
  private settled = false;

  constructor(
    private readonly recordingId: string,
    private readonly recorder: MediaRecorderLike,
    private readonly now: () => string,
    private readonly onFinished: () => void,
    private readonly onChunk?: (chunk: RecordedChunk) => void | Promise<void>,
  ) {
    this.finished = new Promise<RecordingResult>((resolve) => {
      this.resolveFinished = resolve;
    });
  }

  start(): void {
    this.recorder.ondataavailable = (event) => {
      if (event.data.size === 0) {
        return;
      }
      const chunk = { sequence: this.chunks.length, blob: event.data, createdAt: this.now() };
      this.chunks.push(chunk);
      if (this.onChunk) {
        this.pendingChunkWrites.push(Promise.resolve(this.onChunk(chunk)));
      }
    };
    this.recorder.onstop = () => this.complete("completed");
    this.recorder.onerror = () => this.complete("recoverable");
    this.recorder.start(5_000);
  }

  pause(): void {
    if (this.recorder.state === "recording") {
      this.recorder.pause();
    }
  }

  resume(): void {
    if (this.recorder.state === "paused") {
      this.recorder.resume();
    }
  }

  async stop(): Promise<RecordingResult> {
    if (this.recorder.state !== "inactive") {
      this.recorder.stop();
    }
    const result = await this.finished;
    await Promise.all(this.pendingChunkWrites);
    return result;
  }

  private complete(status: RecordingResult["status"]): void {
    if (this.settled) {
      return;
    }
    this.settled = true;
    this.onFinished();
    const blob = new Blob(this.chunks.map((chunk) => chunk.blob), { type: "video/webm" });
    this.resolveFinished({ status, recordingId: this.recordingId, chunks: [...this.chunks], blob });
  }
}

export function selectRecordingMimeType(isTypeSupported: (mimeType: string) => boolean): string {
  const supported = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return supported.find((mimeType) => isTypeSupported(mimeType)) ?? "video/webm";
}

export function createBrowserMediaFacade(): BrowserMediaFacade {
  const microphoneLevelMeter = createBrowserMicrophoneLevelMeter();
  return new BrowserMediaFacade({
    requestUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
    createRecorder: (stream, options) =>
      new MediaRecorder(stream as MediaStream, options) as unknown as MediaRecorderLike,
    isTypeSupported: (mimeType) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeType),
    getMicrophoneLevel: (stream) => microphoneLevelMeter.measure(stream as MediaStream),
  });
}
