import { AcousticAnalysisProgressStage, DeviceAcousticWindow } from '../pipeline/types';
import { AUDIO_CONSTANTS } from './audioConstants';
import {
  absDiff,
  applyHanningWindow,
  clamp01,
  computeFrameRms,
  frameAudio,
  frameIndexToTime,
  mean,
  quantizeMetric,
  roundTo,
  stdDev,
  yieldToJs,
} from './audioUtils';
import type { DecodedAudio } from './audioFileDecoder';

export interface AcousticExtractionResult {
  acoustic_metrics: {
    pitch_variance_normalized: number;
    jitter_normalized: number;
    energy_variation_normalized: number;
    pause_ratio: number;
  };
  acoustic_windows: DeviceAcousticWindow[];
  debug_stats: {
    analyzed_frames: number;
    voiced_frames: number;
    duration_seconds: number;
    analysis_duration_ms: number;
  };
}

interface PitchDetectorResult {
  frequency: number;
  probability?: number;
}

type MeydaLike = {
  bufferSize?: number;
  sampleRate?: number;
  numberOfMFCCCoefficients?: number;
  extract: (
    features: string[] | string,
    signal: Float32Array,
  ) => null | { rms?: number };
};

async function loadMeyda(): Promise<MeydaLike> {
  const module = await import('meyda');
  const meyda = (module.default ?? module) as MeydaLike;
  meyda.bufferSize = AUDIO_CONSTANTS.FFT_SIZE;
  meyda.sampleRate = AUDIO_CONSTANTS.SAMPLE_RATE;
  return meyda;
}

async function loadPitchDetector(): Promise<{
  findPitch: (frame: Float32Array, sampleRate: number) => Promise<PitchDetectorResult>;
}> {
  const module = await import('react-native-pitch-detector');
  return (module.default ?? module) as {
    findPitch: (frame: Float32Array, sampleRate: number) => Promise<PitchDetectorResult>;
  };
}

function computePitchVarianceNormalized(voicedF0: number[]): number {
  if (voicedF0.length < 2) return 0;
  const meanF0 = mean(voicedF0);
  if (meanF0 <= 0) return 0;

  const raw = stdDev(voicedF0) / meanF0;
  return clamp01(
    (raw - AUDIO_CONSTANTS.PITCH_VARIANCE_MIN) /
      (AUDIO_CONSTANTS.PITCH_VARIANCE_MAX - AUDIO_CONSTANTS.PITCH_VARIANCE_MIN),
  );
}

function computeJitterNormalized(voicedF0: number[]): number {
  if (voicedF0.length < 2) return 0;
  const meanF0 = mean(voicedF0);
  if (meanF0 <= 0) return 0;

  const raw = mean(absDiff(voicedF0)) / meanF0;
  return clamp01(raw / AUDIO_CONSTANTS.JITTER_THRESHOLD);
}

function computeEnergyVariationNormalized(rmsFrames: number[]): number {
  if (rmsFrames.length < 2) return 0;
  const avg = mean(rmsFrames);
  if (avg <= 0) return 0;

  const raw = stdDev(rmsFrames) / avg;
  return clamp01(raw / AUDIO_CONSTANTS.ENERGY_VAR_THRESHOLD);
}

function computePauseRatio(rmsFrames: number[]): number {
  if (rmsFrames.length === 0) return 0;
  const silentFrames = rmsFrames.filter(
    (rms) => rms <= AUDIO_CONSTANTS.PAUSE_RMS_THRESHOLD,
  ).length;
  return clamp01(silentFrames / rmsFrames.length);
}

function buildAcousticWindows(frameMetrics: Array<{ rms: number; f0: number }>): DeviceAcousticWindow[] {
  const grouped = new Map<number, Array<{ rms: number; f0: number }>>();

  frameMetrics.forEach((metric, frameIndex) => {
    const timeStart = frameIndexToTime(frameIndex);
    const windowIndex = Math.floor(timeStart / AUDIO_CONSTANTS.WINDOW_SIZE_SECONDS);
    const current = grouped.get(windowIndex) ?? [];
    current.push(metric);
    grouped.set(windowIndex, current);
  });

  return Array.from(grouped.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([windowIndex, metrics]) => {
      const voicedF0 = metrics.map((metric) => metric.f0).filter((value) => value > 0);
      const rmsValues = metrics.map((metric) => metric.rms);

      return {
        window_index: windowIndex,
        time_start: roundTo(windowIndex * AUDIO_CONSTANTS.WINDOW_SIZE_SECONDS),
        time_end: roundTo((windowIndex + 1) * AUDIO_CONSTANTS.WINDOW_SIZE_SECONDS),
        pitch_variance_normalized: quantizeMetric(
          computePitchVarianceNormalized(voicedF0),
        ),
        pause_ratio: quantizeMetric(computePauseRatio(rmsValues)),
      };
    });
}

export async function extractAcousticFeatures(
  audio: DecodedAudio,
  onProgress?: (stage: AcousticAnalysisProgressStage) => void,
): Promise<AcousticExtractionResult> {
  const startedAt = Date.now();
  onProgress?.('decoding_audio');

  const frames = frameAudio(audio.pcm);
  const [meyda, pitchDetector] = await Promise.all([loadMeyda(), loadPitchDetector()]);
  onProgress?.('analyzing_chunks');

  const rmsFrames: number[] = [];
  const f0Frames: number[] = [];
  const frameMetrics: Array<{ rms: number; f0: number }> = [];

  for (let index = 0; index < frames.length; index += 1) {
    const frame = applyHanningWindow(frames[index]);
    const features = meyda.extract(['rms'], frame);
    const rms = features?.rms ?? computeFrameRms(frame);

    let f0 = 0;
    try {
      const pitch = await pitchDetector.findPitch(frame, audio.sampleRate);
      const probability = pitch.probability ?? 1;

      if (
        probability >= AUDIO_CONSTANTS.PITCH_CONFIDENCE_THRESHOLD &&
        pitch.frequency >= AUDIO_CONSTANTS.F0_MIN_HZ &&
        pitch.frequency <= AUDIO_CONSTANTS.F0_MAX_HZ
      ) {
        f0 = pitch.frequency;
      }
    } catch {
      f0 = 0;
    }

    rmsFrames.push(rms);
    f0Frames.push(f0);
    frameMetrics.push({ rms, f0 });

    if ((index + 1) % AUDIO_CONSTANTS.YIELD_EVERY_N_FRAMES === 0) {
      await yieldToJs();
    }
  }

  onProgress?.('building_windows');
  const voicedF0 = f0Frames.filter((value) => value > 0);
  const acousticWindows = buildAcousticWindows(frameMetrics);

  onProgress?.('finalizing_metrics');
  return {
    acoustic_metrics: {
      pitch_variance_normalized: quantizeMetric(
        computePitchVarianceNormalized(voicedF0),
      ),
      jitter_normalized: quantizeMetric(computeJitterNormalized(voicedF0)),
      energy_variation_normalized: quantizeMetric(
        computeEnergyVariationNormalized(rmsFrames),
      ),
      pause_ratio: quantizeMetric(computePauseRatio(rmsFrames)),
    },
    acoustic_windows: acousticWindows,
    debug_stats: {
      analyzed_frames: frames.length,
      voiced_frames: voicedF0.length,
      duration_seconds: roundTo(audio.durationSeconds),
      analysis_duration_ms: Date.now() - startedAt,
    },
  };
}
