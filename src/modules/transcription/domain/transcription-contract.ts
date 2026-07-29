import { z } from "zod";

import { ApplicationError } from "@/domain/errors/application-error";

const supportedMimeTypes = ["audio/webm", "audio/ogg", "audio/wav"] as const;
const maximumAudioBytes = 5 * 1024 * 1024;
const maximumUtteranceDurationMs = 30_000;

export const transcriptionMetadataSchema = z
  .object({
    sessionId: z.string().min(1),
    utteranceId: z.string().min(1),
    startedAtMs: z.number().int().min(0),
    endedAtMs: z.number().int().min(1),
    locale: z.literal("ja-JP"),
    mimeType: z.enum(supportedMimeTypes),
  })
  .refine((metadata) => metadata.endedAtMs > metadata.startedAtMs, {
    message: "Utterance end time must be after its start time.",
  })
  .refine((metadata) => metadata.endedAtMs - metadata.startedAtMs <= maximumUtteranceDurationMs, {
    message: "Utterance duration must not exceed 30 seconds.",
  });

export const transcriptionResponseSchema = z.object({
  utteranceId: z.string().min(1),
  transcript: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  startedAtMs: z.number().int().min(0),
  endedAtMs: z.number().int().min(0),
  isEmpty: z.boolean(),
});

export type TranscriptionMetadata = z.infer<typeof transcriptionMetadataSchema>;
export type TranscriptionResult = z.infer<typeof transcriptionResponseSchema>;
export type TranscriptionInput = { audio: Blob; metadata: TranscriptionMetadata };

export class TranscriptionValidationError extends ApplicationError {
  constructor(code: "STT_INVALID_AUDIO" | "STT_AUDIO_TOO_LARGE" | "STT_EMPTY_AUDIO" | "STT_UNSUPPORTED_MIME") {
    super(code, "音声データを確認できませんでした。");
    this.name = "TranscriptionValidationError";
  }
}

export function validateTranscriptionInput(input: { audio: Blob; metadata: unknown }): TranscriptionInput {
  const metadata = transcriptionMetadataSchema.safeParse(input.metadata);
  if (!metadata.success) {
    throw new TranscriptionValidationError("STT_INVALID_AUDIO");
  }
  if (input.audio.size > maximumAudioBytes) {
    throw new TranscriptionValidationError("STT_AUDIO_TOO_LARGE");
  }
  if (input.audio.type !== metadata.data.mimeType || !supportedMimeTypes.includes(input.audio.type as (typeof supportedMimeTypes)[number])) {
    throw new TranscriptionValidationError("STT_UNSUPPORTED_MIME");
  }
  return { audio: input.audio, metadata: metadata.data };
}

export function normalizeTranscriptionResponse(response: unknown): TranscriptionResult {
  const parsed = transcriptionResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new TranscriptionValidationError("STT_INVALID_AUDIO");
  }
  return parsed.data;
}

export function emptyTranscription(metadata: TranscriptionMetadata): TranscriptionResult {
  return {
    utteranceId: metadata.utteranceId,
    transcript: "",
    startedAtMs: metadata.startedAtMs,
    endedAtMs: metadata.endedAtMs,
    isEmpty: true,
  };
}
