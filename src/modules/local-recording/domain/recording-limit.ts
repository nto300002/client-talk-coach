import { ApplicationError } from "@/domain/errors/application-error";

export type RecordingDeletionReason = "manual" | "retention_expired" | "recording_limit" | null;
export type RecordingStatus = "recording" | "completed" | "recoverable" | "deleted";

export type RecordingMetadata = {
  id: string;
  sessionId: string;
  createdAt: string;
  deletedAt: string | null;
  deletionReason: RecordingDeletionReason;
  isFavorite: boolean;
  status: RecordingStatus;
};

export type RecordingChunk = {
  id: string;
  recordingId: string;
  sequence: number;
  createdAt: string;
  blob: Blob;
};

export const completedRecordingLimit = 20;

export class RecordingLimitReachedError extends ApplicationError {
  constructor() {
    super(
      "RECORDING_LIMIT_REACHED",
      "All saved recordings are favorites. Remove a favorite or delete a recording before starting.",
    );
    this.name = "RecordingLimitReachedError";
  }
}

export function selectRecordingLimitCleanup(
  recordings: RecordingMetadata[],
): RecordingMetadata | null {
  const completed = recordings.filter(isStoredCompletedRecording);

  if (completed.length < completedRecordingLimit) {
    return null;
  }

  const candidates = completed.filter((recording) => !recording.isFavorite);
  if (candidates.length === 0) {
    throw new RecordingLimitReachedError();
  }

  return [...candidates].sort(compareOldestFirst)[0];
}

export function isStoredCompletedRecording(recording: RecordingMetadata): boolean {
  return recording.status === "completed" && recording.deletedAt === null;
}

function compareOldestFirst(left: RecordingMetadata, right: RecordingMetadata): number {
  const createdAtComparison = left.createdAt.localeCompare(right.createdAt);
  return createdAtComparison === 0 ? left.id.localeCompare(right.id) : createdAtComparison;
}
