export type DeviceReadinessReason =
  | "camera_denied"
  | "microphone_denied"
  | "storage_unavailable"
  | "recording_unsupported"
  | "microphone_level_low";

export type DeviceReadinessInput = {
  cameraGranted: boolean;
  microphoneGranted: boolean;
  storageAvailable: boolean;
  recordingSupported: boolean;
  microphoneLevel: number;
};

export type DeviceReadiness = {
  status: "ready" | "warning" | "blocked";
  reasons: DeviceReadinessReason[];
};

const lowMicrophoneLevelThreshold = 0.015;

export function isLowMicrophoneLevel(level: number): boolean {
  return level < lowMicrophoneLevelThreshold;
}

export function classifyDeviceReadiness(input: DeviceReadinessInput): DeviceReadiness {
  const blockingReasons: DeviceReadinessReason[] = [];
  if (!input.cameraGranted) {
    blockingReasons.push("camera_denied");
  }
  if (!input.microphoneGranted) {
    blockingReasons.push("microphone_denied");
  }
  if (!input.storageAvailable) {
    blockingReasons.push("storage_unavailable");
  }
  if (!input.recordingSupported) {
    blockingReasons.push("recording_unsupported");
  }

  if (blockingReasons.length > 0) {
    return { status: "blocked", reasons: blockingReasons };
  }

  return isLowMicrophoneLevel(input.microphoneLevel)
    ? { status: "warning", reasons: ["microphone_level_low"] }
    : { status: "ready", reasons: [] };
}
