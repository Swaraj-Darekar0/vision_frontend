import { AUDIO_CONSTANTS, AUDIO_PIPELINE_VERSION } from '../../audio/audioConstants';

export const DEVICE_PIPELINE_FLAGS = {
  useDevicePosePipeline: true,
  useDeviceAcousticPipeline: true,
} as const;

export const DEVICE_PIPELINE_VERSION = {
  pose: 'pose-device-v1',
  audio: AUDIO_PIPELINE_VERSION.pipeline,
  formula: AUDIO_PIPELINE_VERSION.formula,
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
    sampleRate: AUDIO_CONSTANTS.SAMPLE_RATE,
    transcriptionFormat: 'm4a',
    transcriptionBitrate: '64k',
    fftSize: AUDIO_CONSTANTS.FFT_SIZE,
    hopLength: AUDIO_CONSTANTS.HOP_LENGTH,
    pitchVarianceMin: AUDIO_CONSTANTS.PITCH_VARIANCE_MIN,
    pitchVarianceMax: AUDIO_CONSTANTS.PITCH_VARIANCE_MAX,
    jitterThreshold: AUDIO_CONSTANTS.JITTER_THRESHOLD,
    energyVariationThreshold: AUDIO_CONSTANTS.ENERGY_VAR_THRESHOLD,
    pauseRmsThreshold: AUDIO_CONSTANTS.PAUSE_RMS_THRESHOLD,
    windowSizeSeconds: AUDIO_CONSTANTS.WINDOW_SIZE_SECONDS,
  },
} as const;
