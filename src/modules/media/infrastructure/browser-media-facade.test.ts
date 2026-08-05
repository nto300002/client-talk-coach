import { describe, expect, it, vi } from "vitest";

import {
  BrowserMediaFacade,
  RecordingAlreadyStartedError,
  type MediaRecorderLike,
} from "@/modules/media/infrastructure/browser-media-facade";

describe("BrowserMediaFacade", () => {
  it("requests a camera and microphone stream and stops every track during teardown", async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] };
    const requestUserMedia = vi.fn().mockResolvedValue(stream);
    const facade = new BrowserMediaFacade({
      requestUserMedia,
      createRecorder: () => new FakeRecorder(),
      isTypeSupported: () => true,
      getMicrophoneLevel: () => 0.04,
    });

    const session = await facade.requestPreview();
    facade.stopPreview(session);

    expect(requestUserMedia).toHaveBeenCalledWith({ video: true, audio: true });
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it("keeps recording chunks in their received order and produces a playable blob on stop", async () => {
    const recorder = new FakeRecorder();
    const facade = new BrowserMediaFacade({
      requestUserMedia: async () => ({ getTracks: () => [] }),
      createRecorder: () => recorder,
      isTypeSupported: () => true,
      getMicrophoneLevel: () => 0.04,
    });
    const preview = await facade.requestPreview();
    const recording = facade.startRecording({ recordingId: "recording-1", stream: preview.stream });

    recorder.emitChunk("first");
    recorder.emitChunk("second");
    const result = await recording.stop();

    expect(result.status).toBe("completed");
    expect(result.chunks.map((chunk) => chunk.sequence)).toEqual([0, 1]);
    expect(await result.blob.text()).toBe("firstsecond");
  });

  it("rejects duplicate recording starts for the same media facade", async () => {
    const facade = new BrowserMediaFacade({
      requestUserMedia: async () => ({ getTracks: () => [] }),
      createRecorder: () => new FakeRecorder(),
      isTypeSupported: () => true,
      getMicrophoneLevel: () => 0.04,
    });
    const preview = await facade.requestPreview();
    facade.startRecording({ recordingId: "recording-1", stream: preview.stream });

    expect(() => facade.startRecording({ recordingId: "recording-2", stream: preview.stream })).toThrow(
      RecordingAlreadyStartedError,
    );
  });

  it("marks an interrupted recording as recoverable", async () => {
    const recorder = new FakeRecorder();
    const facade = new BrowserMediaFacade({
      requestUserMedia: async () => ({ getTracks: () => [] }),
      createRecorder: () => recorder,
      isTypeSupported: () => true,
      getMicrophoneLevel: () => 0.04,
    });
    const preview = await facade.requestPreview();
    const recording = facade.startRecording({ recordingId: "recording-1", stream: preview.stream });

    recorder.interrupt();

    await expect(recording.finished).resolves.toMatchObject({ status: "recoverable" });
  });
});

class FakeRecorder implements MediaRecorderLike {
  state: "inactive" | "recording" | "paused" = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: { error: Error }) => void) | null = null;

  start() {
    this.state = "recording";
  }

  pause() {
    this.state = "paused";
  }

  resume() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.onstop?.();
  }

  emitChunk(text: string) {
    this.ondataavailable?.({ data: new Blob([text], { type: "video/webm" }) });
  }

  interrupt() {
    this.state = "inactive";
    this.onerror?.({ error: new Error("unexpected interruption") });
  }
}
