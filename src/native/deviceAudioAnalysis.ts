import { EmitterSubscription, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { AcousticAnalysisProgressStage } from '../pipeline/types';

export interface NativeAcousticWindow {
  window_index: number;
  time_start: number;
  time_end: number;
  pitch_variance_normalized: number;
  pause_ratio: number;
}

export interface NativeAudioAnalysisDebugStats {
  analysis_duration_ms: number;
  analyzed_frames: number;
  voiced_frames: number;
  skipped_unvoiced_frames: number;
  decoded_duration_seconds: number;
}

export interface NativeAudioAnalysisResult {
  sample_rate: number;
  duration_seconds: number;
  pitch_variance_raw: number;
  pitch_variance_normalized: number;
  jitter_raw: number;
  jitter_normalized: number;
  energy_variation_raw: number;
  energy_variation_normalized: number;
  pause_ratio: number;
  acoustic_windows?: NativeAcousticWindow[];
  debug_stats?: NativeAudioAnalysisDebugStats;
}

export interface NativeAudioAnalysisProgressEvent {
  stage: AcousticAnalysisProgressStage;
  progress?: number;
}

interface DeviceAudioAnalysisModuleShape {
  analyzeAudioFile(uri: string): Promise<NativeAudioAnalysisResult>;
  addListener?(eventName: string): void;
  removeListeners?(count: number): void;
}

const PROGRESS_EVENT_NAME = 'DeviceAudioAnalysisProgress';

function getNativeModule(): DeviceAudioAnalysisModuleShape | null {
  if (Platform.OS !== 'android') {
    return null;
  }

  return (NativeModules.DeviceAudioAnalysis as DeviceAudioAnalysisModuleShape | undefined) ?? null;
}

function getEventEmitter(): NativeEventEmitter | null {
  const module = getNativeModule();
  if (module == null) {
    return null;
  }

  return new NativeEventEmitter(NativeModules.DeviceAudioAnalysis);
}

export function isDeviceAudioAnalysisAvailable(): boolean {
  return getNativeModule() != null;
}

export function addDeviceAudioAnalysisProgressListener(
  listener: (event: NativeAudioAnalysisProgressEvent) => void,
): EmitterSubscription | null {
  const emitter = getEventEmitter();
  if (emitter == null) {
    return null;
  }

  return emitter.addListener(PROGRESS_EVENT_NAME, listener);
}

export async function analyzeAudioFile(uri: string): Promise<NativeAudioAnalysisResult> {
  const module = getNativeModule();

  if (module == null) {
    throw new Error(
      'Device audio analysis module is unavailable. Rebuild the Android app after installing the native changes.'
    );
  }

  return module.analyzeAudioFile(uri);
}
