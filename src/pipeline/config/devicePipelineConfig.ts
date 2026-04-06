export const DEVICE_PIPELINE_FLAGS = {
  useDevicePosePipeline: true,
  useDeviceAcousticPipeline: true,
} as const;

export const DEVICE_PIPELINE_VERSION = {
  pose: 'pose-device-v1',
  audio: 'audio-extract-m4a-v1',
  formula: 'frontend-formulas-2026-04-02',
} as const;

export const DEVICE_PIPELINE_CONFIG = {
  pose: {
    minVisibilityThreshold: 0.5,
    shoulderAlignmentThreshold: 0.1,
    spineStraightnessThreshold: 0.2,
    headStabilityThreshold: 0.05,
    bodySwayThreshold: 0.05,
    fidgetThreshold: 0.1,
    movementVarianceThreshold: 0.1,
    gazeDeviationThreshold: 0.1,
    swayDeadZone: 0.01,
    postureOpennessMaxWidth: 1.0,
    optimalHandAmplitude: 0.45,
    stillnessDistanceThreshold: 0.5,
    gestureDistanceThreshold: 0.5,
    windowSizeSeconds: 5.0,
  },
  audio: {
    sampleRate: 16000,
    transcriptionFormat: 'm4a',
    transcriptionBitrate: '64k',
    pitchVarianceMin: 0.05,
    pitchVarianceMax: 0.5,
    jitterThreshold: 0.02,
    energyVariationThreshold: 0.1,
    pauseRmsThreshold: 0.01,
    windowSizeSeconds: 5.0,
  },
} as const;
