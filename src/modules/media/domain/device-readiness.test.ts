import { describe, expect, it } from "vitest";

import {
  classifyDeviceReadiness,
  isLowMicrophoneLevel,
} from "@/modules/media/domain/device-readiness";

describe("device readiness", () => {
  it("marks camera and microphone readiness as ready", () => {
    expect(
      classifyDeviceReadiness({
        cameraGranted: true,
        microphoneGranted: true,
        storageAvailable: true,
        recordingSupported: true,
        microphoneLevel: 0.04,
      }),
    ).toEqual({ status: "ready", reasons: [] });
  });

  it("warns when microphone input is lower than the personal baseline", () => {
    expect(isLowMicrophoneLevel(0.01)).toBe(true);
    expect(
      classifyDeviceReadiness({
        cameraGranted: true,
        microphoneGranted: true,
        storageAvailable: true,
        recordingSupported: true,
        microphoneLevel: 0.01,
      }),
    ).toEqual({ status: "warning", reasons: ["microphone_level_low"] });
  });

  it("blocks practice when a required device, storage, or recording support is unavailable", () => {
    expect(
      classifyDeviceReadiness({
        cameraGranted: false,
        microphoneGranted: false,
        storageAvailable: false,
        recordingSupported: false,
        microphoneLevel: 0,
      }),
    ).toEqual({
      status: "blocked",
      reasons: ["camera_denied", "microphone_denied", "storage_unavailable", "recording_unsupported"],
    });
  });
});
