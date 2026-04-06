import {
  absDiff,
  clamp01,
  computeFrameRms,
  frameAudio,
  mean,
  quantizeMetric,
  stdDev,
} from '../audioUtils';

describe('audioUtils', () => {
  it('clamps values into the unit interval', () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(-0.25)).toBe(0);
    expect(clamp01(0.25)).toBe(0.25);
  });

  it('computes mean and standard deviation safely', () => {
    expect(mean([])).toBe(0);
    expect(mean([2, 4, 6])).toBe(4);
    expect(stdDev([1, 1, 1])).toBe(0);
    expect(stdDev([1, 2, 3])).toBeGreaterThan(0);
  });

  it('computes frame rms for silence and signal', () => {
    expect(computeFrameRms(new Float32Array(4))).toBe(0);
    expect(computeFrameRms(new Float32Array([1, 1, 1, 1]))).toBe(1);
  });

  it('creates padded frames for short audio', () => {
    const frames = frameAudio(new Float32Array([0.5, 0.25]), 4, 2);
    expect(frames).toHaveLength(1);
    expect(frames[0]).toHaveLength(4);
  });

  it('computes absolute diffs and quantized metrics', () => {
    expect(absDiff([10, 7, 6])).toEqual([3, 1]);
    expect(quantizeMetric(0.123456)).toBe(0.1235);
    expect(quantizeMetric(2)).toBe(1);
  });
});
