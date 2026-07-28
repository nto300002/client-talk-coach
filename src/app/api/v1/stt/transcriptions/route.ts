import { NextResponse } from "next/server";

import { parseRuntimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { ProcessUserUtterance, TranscriptionProviderError } from "@/modules/transcription/application/process-user-utterance";
import { GoogleSpeechTranscriptionAdapter } from "@/modules/transcription/infrastructure/google-speech-transcription-adapter";
import { MockTranscriptionAdapter } from "@/modules/transcription/infrastructure/mock-transcription-adapter";
import { TranscriptionValidationError } from "@/modules/transcription/domain/transcription-contract";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const metadataText = formData.get("metadata");
    if (!isBlobLike(audio) || typeof metadataText !== "string") {
      throw new TranscriptionValidationError("STT_INVALID_AUDIO");
    }
    let metadata: unknown;
    try {
      metadata = JSON.parse(metadataText);
    } catch {
      throw new TranscriptionValidationError("STT_INVALID_AUDIO");
    }

    const config = parseRuntimeEnvironment(process.env);
    const adapter = config.mode === "mock" ? new MockTranscriptionAdapter() : new GoogleSpeechTranscriptionAdapter(config);
    const result = await new ProcessUserUtterance(adapter).execute({ audio, metadata: metadata as never, isSpeech: true });
    if (result.status === "transcribed") {
      return NextResponse.json({
        data: {
          utteranceId: result.turn.utteranceId,
          transcript: result.turn.text,
          confidence: result.turn.confidence,
          startedAtMs: result.turn.startedAtMs,
          endedAtMs: result.turn.endedAtMs,
          isEmpty: false,
        },
      });
    }
    return NextResponse.json({ data: { utteranceId: (metadata as { utteranceId?: string }).utteranceId ?? "", transcript: "", isEmpty: true } });
  } catch (error) {
    return errorResponse(error);
  }
}

function isBlobLike(value: FormDataEntryValue | null): value is File {
  return value !== null && typeof value === "object" && "arrayBuffer" in value && "size" in value && "type" in value;
}

function errorResponse(error: unknown) {
  if (error instanceof TranscriptionValidationError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 400 });
  }
  if (error instanceof TranscriptionProviderError) {
    const status = error.code === "STT_RATE_LIMITED" ? 429 : 503;
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status });
  }
  return NextResponse.json(
    { error: { code: "STT_PROVIDER_UNAVAILABLE", message: "音声を文字に変換できませんでした。もう一度お試しください。" } },
    { status: 503 },
  );
}
