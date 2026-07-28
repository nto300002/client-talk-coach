export type AudioFrame = { startMs: number; durationMs: number; rms: number };
export type TimedInterval = { startMs: number; endMs: number };
export type AudioMarkerCategory = "low_volume" | "long_silence" | "response_delay" | "filler" | "overlap";
export type AudioMarker = {
  category: AudioMarkerCategory;
  timestampMs: number;
  endMs?: number;
  detail: string;
};

export type AudioAnalysisInput = {
  baselineRms: number;
  frames: AudioFrame[];
  transcript: string;
  aiSpeechIntervals: TimedInterval[];
};

export type AudioAnalysisResult = {
  averageRms: number;
  speechIntervals: TimedInterval[];
  firstResponseDelayMs: number | null;
  speakingSpeedCharactersPerMinute: number;
  fillerCount: number;
  markers: AudioMarker[];
};

const voiceActivityThreshold = 0.01;
const lowVolumeBaselineRatio = 0.8;
const longSilenceThresholdMs = 1_500;

export function calculateRms(samples: number[] | Float32Array): number {
  if (samples.length === 0) {
    return 0;
  }
  const squaredSum = Array.from(samples).reduce((sum, sample) => sum + sample * sample, 0);
  return Math.sqrt(squaredSum / samples.length);
}

export function analyzeAudio(input: AudioAnalysisInput): AudioAnalysisResult {
  const frames = [...input.frames].sort((left, right) => left.startMs - right.startMs);
  const speechIntervals = detectSpeechIntervals(frames);
  const markers: AudioMarker[] = [
    ...detectLowVolumeMarkers(frames, input.baselineRms),
    ...detectLongSilenceMarkers(speechIntervals),
  ];

  const firstResponseDelayMs = calculateFirstResponseDelay(input.aiSpeechIntervals, speechIntervals);
  if (firstResponseDelayMs !== null && firstResponseDelayMs > 0) {
    markers.push({
      category: "response_delay",
      timestampMs: speechIntervals[0]?.startMs ?? 0,
      detail: `回答開始まで${firstResponseDelayMs}msかかりました。`,
    });
  }

  const fillers = detectFillers(input.transcript);
  const firstSpeechTimestamp = speechIntervals[0]?.startMs ?? 0;
  markers.push(
    ...fillers.map((filler) => ({
      category: "filler" as const,
      timestampMs: firstSpeechTimestamp,
      detail: `フィラー「${filler.text}」を検出しました。`,
    })),
  );

  markers.push(
    ...findOverlaps(speechIntervals, input.aiSpeechIntervals).map((overlap) => ({
      category: "overlap" as const,
      timestampMs: overlap.startMs,
      endMs: overlap.endMs,
      detail: "AI顧客の発話と重なりました。",
    })),
  );

  const speechDurationMs = speechIntervals.reduce((total, interval) => total + interval.endMs - interval.startMs, 0);
  return {
    averageRms: frames.length === 0 ? 0 : frames.reduce((total, frame) => total + frame.rms, 0) / frames.length,
    speechIntervals,
    firstResponseDelayMs,
    speakingSpeedCharactersPerMinute:
      speechDurationMs === 0 ? 0 : Math.round((countJapaneseSpeechCharacters(input.transcript) * 60_000) / speechDurationMs),
    fillerCount: fillers.length,
    markers: markers.sort((left, right) => left.timestampMs - right.timestampMs),
  };
}

export function detectSpeechIntervals(frames: AudioFrame[]): TimedInterval[] {
  const intervals: TimedInterval[] = [];
  for (const frame of frames) {
    if (frame.rms < voiceActivityThreshold) {
      continue;
    }
    const endMs = frame.startMs + frame.durationMs;
    const previous = intervals.at(-1);
    if (previous && previous.endMs === frame.startMs) {
      previous.endMs = endMs;
    } else {
      intervals.push({ startMs: frame.startMs, endMs });
    }
  }
  return intervals;
}

export function countJapaneseSpeechCharacters(transcript: string): number {
  return [...transcript].filter((character) => !/[\s、。！？!?・,，.]/u.test(character)).length;
}

export function detectFillers(transcript: string): Array<{ text: string; index: number }> {
  const expression = /(^|[\s、。！？!?])((?:えー|あの|その|まあ|そうですね|ちょっと|一応))(?=$|[\s、。！？!?])/gu;
  return Array.from(transcript.matchAll(expression), (match) => ({
    text: match[2],
    index: (match.index ?? 0) + match[1].length,
  }));
}

export function findOverlaps(left: TimedInterval[], right: TimedInterval[]): TimedInterval[] {
  const overlaps: TimedInterval[] = [];
  for (const first of left) {
    for (const second of right) {
      const startMs = Math.max(first.startMs, second.startMs);
      const endMs = Math.min(first.endMs, second.endMs);
      if (startMs < endMs) {
        overlaps.push({ startMs, endMs });
      }
    }
  }
  return overlaps.sort((first, second) => first.startMs - second.startMs);
}

function detectLowVolumeMarkers(frames: AudioFrame[], baselineRms: number): AudioMarker[] {
  const threshold = baselineRms * lowVolumeBaselineRatio;
  return frames
    .filter((frame) => frame.rms >= voiceActivityThreshold && frame.rms < threshold)
    .map((frame) => ({
      category: "low_volume" as const,
      timestampMs: frame.startMs,
      endMs: frame.startMs + frame.durationMs,
      detail: "個人基準より小さい音量です。",
    }));
}

function detectLongSilenceMarkers(speechIntervals: TimedInterval[]): AudioMarker[] {
  return speechIntervals.slice(1).flatMap((interval, index) => {
    const previous = speechIntervals[index];
    const durationMs = interval.startMs - previous.endMs;
    return durationMs >= longSilenceThresholdMs
      ? [{ category: "long_silence" as const, timestampMs: previous.endMs, endMs: interval.startMs, detail: `${durationMs}msの沈黙です。` }]
      : [];
  });
}

function calculateFirstResponseDelay(
  aiSpeechIntervals: TimedInterval[],
  speechIntervals: TimedInterval[],
): number | null {
  const firstSpeech = speechIntervals[0];
  if (!firstSpeech || aiSpeechIntervals.length === 0) {
    return null;
  }
  const lastAiEnd = Math.max(...aiSpeechIntervals.map((interval) => interval.endMs));
  return Math.max(0, firstSpeech.startMs - lastAiEnd);
}
