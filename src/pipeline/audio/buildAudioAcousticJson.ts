import {
  addDeviceAudioAnalysisProgressListener,
  analyzeAudioFile,
  NativeAudioAnalysisDebugStats,
} from '../../native/deviceAudioAnalysis';
import { clamp01 } from '../shared/math';
import { DEVICE_PIPELINE_VERSION } from '../config/devicePipelineConfig';
import { AcousticAnalysisProgressStage, DeviceAudioAcousticJson } from '../types';

export interface BuildAudioAcousticJsonResult {
  payload: DeviceAudioAcousticJson;
  debugStats?: NativeAudioAnalysisDebugStats;
}

export async function buildAudioAcousticJson(
  sessionId: string,
  audioUri: string,
  onProgress?: (stage: AcousticAnalysisProgressStage) => void,
): Promise<BuildAudioAcousticJsonResult> {
  console.log('[DevicePipeline] Audio metrics extraction started', {
    sessionId,
    audioUri,
  });
  const startedAtMs = Date.now();
  const subscription = addDeviceAudioAnalysisProgressListener((event) => {
    console.log('[DevicePipeline] Audio metrics extraction progress', {
      sessionId,
      stage: event.stage,
    });
    onProgress?.(event.stage);
  });

  try {
    const nativeMetrics = await analyzeAudioFile(audioUri);

    console.log('[DevicePipeline] Audio metrics extraction completed', {
      sessionId,
      hasDebugStats: !!nativeMetrics.debug_stats,
      acousticWindowCount: nativeMetrics.acoustic_windows?.length ?? 0,
      elapsedMs: Date.now() - startedAtMs,
    });

    return {
      payload: {
        session_metadata: {
          session_id: sessionId,
          pipeline: DEVICE_PIPELINE_VERSION.audio,
          formula_version: DEVICE_PIPELINE_VERSION.formula,
        },
        acoustic_metrics: {
          pitch_variance_normalized: clamp01(nativeMetrics.pitch_variance_normalized),
          jitter_normalized: clamp01(nativeMetrics.jitter_normalized),
          energy_variation_normalized: clamp01(nativeMetrics.energy_variation_normalized),
          pause_ratio: clamp01(nativeMetrics.pause_ratio),
        },
        acoustic_windows: nativeMetrics.acoustic_windows?.map((window) => ({
          window_index: window.window_index,
          time_start: window.time_start,
          time_end: window.time_end,
          pitch_variance_normalized: clamp01(window.pitch_variance_normalized),
          pause_ratio: clamp01(window.pause_ratio),
        })),
      },
      debugStats: nativeMetrics.debug_stats,
    };
  } catch (error) {
    console.warn('[DevicePipeline] Audio metrics extraction failed', {
      sessionId,
      audioUri,
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - startedAtMs,
    });
    throw error;
  } finally {
    subscription?.remove();
  }
}
