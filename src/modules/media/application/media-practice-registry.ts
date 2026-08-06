"use client";

import {
  IndexedDbRecordingRepository,
  LocalPracticeDatabase,
} from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";
import {
  BrowserMediaFacade,
  type BrowserRecording,
  type MediaPreview,
} from "@/modules/media/infrastructure/browser-media-facade";
import { analyzePracticeAudio } from "@/modules/audio-analysis/application/analyze-practice-audio";
import type { AudioFrame } from "@/modules/audio-analysis/domain/audio-analysis";
import { createBrowserAudioMonitor } from "@/modules/audio-analysis/infrastructure/browser-audio-monitor";
import type { TimedInterval } from "@/modules/audio-analysis/domain/audio-analysis";

type ActiveMediaPractice = {
  preview: MediaPreview;
  recordingId: string;
  recording: BrowserRecording;
  audioFrames: AudioFrame[];
  baselineRms: number;
  stopAudioMonitor(): void;
};

const activePractices = new Map<string, ActiveMediaPractice>();
let repository: IndexedDbRecordingRepository | null = null;

export async function startMediaPractice(input: {
  sessionId: string;
  preview: MediaPreview;
  media: BrowserMediaFacade;
}): Promise<void> {
  const recordingId = `recording-${crypto.randomUUID()}`;
  const localRepository = getRecordingRepository();
  const createdAt = new Date().toISOString();

  await localRepository.startRecording({
    id: recordingId,
    sessionId: input.sessionId,
    createdAt,
    deletedAt: null,
    deletionReason: null,
    isFavorite: false,
    status: "recording",
  });

  try {
    const recording = input.media.startRecording({
      recordingId,
      stream: input.preview.stream,
      onChunk: (chunk) =>
        localRepository.saveRecordingChunk({
          id: `${recordingId}-${chunk.sequence}`,
          recordingId,
          sequence: chunk.sequence,
          createdAt: chunk.createdAt,
          blob: chunk.blob,
        }),
    });

    const audioFrames: AudioFrame[] = [];
    let stopAudioMonitor: () => void = () => undefined;
    try {
      const audioMonitor = createBrowserAudioMonitor().start(input.preview.stream as MediaStream, (frame) => {
        audioFrames.push(frame);
      });
      stopAudioMonitor = audioMonitor.stop;
    } catch {
      // Recording continues even when browser-specific local monitoring is unavailable.
    }
    activePractices.set(input.sessionId, {
      preview: input.preview,
      recordingId,
      recording,
      audioFrames,
      baselineRms: input.preview.microphoneLevel,
      stopAudioMonitor,
    });
    void recording.finished.then((result) => {
      if (result.status === "recoverable") {
        return localRepository.markRecordingRecoverable(recordingId);
      }
    });
  } catch (error) {
    await localRepository.markRecordingRecoverable(recordingId);
    throw error;
  }
}

export function getActiveMediaPractice(sessionId: string): ActiveMediaPractice | null {
  return activePractices.get(sessionId) ?? null;
}

export function getActiveMediaStream(sessionId: string): MediaStream | null {
  return (activePractices.get(sessionId)?.preview.stream as MediaStream | undefined) ?? null;
}

export async function pauseMediaPractice(sessionId: string): Promise<void> {
  activePractices.get(sessionId)?.recording.pause();
}

export async function resumeMediaPractice(sessionId: string): Promise<void> {
  activePractices.get(sessionId)?.recording.resume();
}

export async function finishMediaPractice(
  sessionId: string,
  analysisInput: { transcript: string; aiSpeechIntervals: TimedInterval[] } = { transcript: "", aiSpeechIntervals: [] },
): Promise<"completed" | "recoverable" | "missing"> {
  const activePractice = activePractices.get(sessionId);
  if (!activePractice) {
    return "missing";
  }

  const result = await activePractice.recording.stop();
  const localRepository = getRecordingRepository();
  activePractice.stopAudioMonitor();
  if (result.status === "completed") {
    await localRepository.completeRecording(activePractice.recordingId);
  } else {
    await localRepository.markRecordingRecoverable(activePractice.recordingId);
  }
  await analyzePracticeAudio(
    {
      analysisId: `audio-${sessionId}`,
      sessionId,
      baselineRms: activePractice.baselineRms,
      frames: activePractice.audioFrames,
      transcript: analysisInput.transcript,
      aiSpeechIntervals: analysisInput.aiSpeechIntervals,
    },
    localRepository,
  );
  activePractices.delete(sessionId);
  activePractice.preview.stream.getTracks().forEach((track) => track.stop());
  return result.status;
}

export function abandonMediaPreview(preview: MediaPreview, media: BrowserMediaFacade): void {
  media.stopPreview(preview);
}

function getRecordingRepository(): IndexedDbRecordingRepository {
  repository ??= new IndexedDbRecordingRepository(new LocalPracticeDatabase());
  return repository;
}
