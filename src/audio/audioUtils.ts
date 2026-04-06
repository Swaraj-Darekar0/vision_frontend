import { AUDIO_CONSTANTS } from './audioConstants';

export function clamp(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function roundTo(value: number, decimals = AUDIO_CONSTANTS.ROUND_DECIMALS): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function absDiff(values: number[]): number[] {
  const diffs: number[] = [];
  for (let index = 1; index < values.length; index += 1) {
    diffs.push(Math.abs(values[index] - values[index - 1]));
  }
  return diffs;
}

export function frameAudio(
  pcm: Float32Array,
  frameSize: number = AUDIO_CONSTANTS.FFT_SIZE,
  hopLength: number = AUDIO_CONSTANTS.HOP_LENGTH,
): Float32Array[] {
  if (pcm.length === 0 || frameSize <= 0 || hopLength <= 0) return [];

  const frames: Float32Array[] = [];
  for (let start = 0; start + frameSize <= pcm.length; start += hopLength) {
    frames.push(pcm.slice(start, start + frameSize));
  }

  if (frames.length === 0 && pcm.length > 0) {
    const padded = new Float32Array(frameSize);
    padded.set(pcm.slice(0, Math.min(frameSize, pcm.length)));
    frames.push(padded);
  }

  return frames;
}

export function applyHanningWindow(frame: Float32Array): Float32Array {
  const windowed = new Float32Array(frame.length);
  const size = frame.length;

  for (let index = 0; index < size; index += 1) {
    const multiplier = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, size - 1));
    windowed[index] = frame[index] * multiplier;
  }

  return windowed;
}

export function computeFrameRms(frame: Float32Array): number {
  if (frame.length === 0) return 0;
  let sumSquares = 0;
  for (let index = 0; index < frame.length; index += 1) {
    const sample = frame[index];
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / frame.length);
}

export function frameIndexToTime(frameIndex: number): number {
  return (frameIndex * AUDIO_CONSTANTS.HOP_LENGTH) / AUDIO_CONSTANTS.SAMPLE_RATE;
}

export function quantizeMetric(value: number): number {
  return roundTo(clamp01(value));
}

export async function yieldToJs(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}
