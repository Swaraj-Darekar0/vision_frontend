import { decodeAudioFile } from '../../audio/audioFileDecoder';
import { extractAcousticFeatures } from '../../audio/acousticExtractor';
import { AUDIO_PIPELINE_VERSION } from '../../audio/audioConstants';
import {
  analyzeAudioFile,
  isDeviceAudioAnalysisAvailable,
} from '../../native/deviceAudioAnalysis';
import { AcousticAnalysisProgressStage, DeviceAudioAcousticJson } from '../types';

export interface BuildAudioAcousticJsonResult {
  payload: DeviceAudioAcousticJson;
  debugStats?: {
    analyzed_frames: number;
    voiced_frames: number;
    duration_seconds: number;
    analysis_duration_ms: number;
  };
}

export async function buildAudioAcousticJson(
  sessionId: string,
  audioUri: string,
  onProgress?: (stage: AcousticAnalysisProgressStage) => void,
): Promise<BuildAudioAcousticJsonResult> {
  console.log('[DevicePipeline] Audio metrics extraction started', {
    sessionId,
    audioUri,
    nativeAnalyzerAvailable: isDeviceAudioAnalysisAvailable(),
  });
  const startedAtMs = Date.now();

  try {
    onProgress?.('decoding_audio');
    let decodedAudio;
    try {
      decodedAudio = await decodeAudioFile(audioUri);
    } catch (error) {
      if (isDeviceAudioAnalysisAvailable()) {
        console.warn('[DevicePipeline] JS audio decode failed; falling back to native analyzer.', {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
        
        const nativeResult = await analyzeAudioFile(audioUri);
        console.log('[DevicePipeline] Native fallback analysis completed', {
          sessionId,
          acousticWindowCount: nativeResult.acoustic_windows?.length ?? 0,
        });

        return {
          payload: {
            session_metadata: {
              session_id: sessionId,
              pipeline: AUDIO_PIPELINE_VERSION.pipeline,
              formula_version: AUDIO_PIPELINE_VERSION.formula,
            },
            acoustic_metrics: {
              pitch_variance_normalized: nativeResult.pitch_variance_normalized,
              jitter_normalized: nativeResult.jitter_normalized,
              energy_variation_normalized: nativeResult.energy_variation_normalized,
              pause_ratio: nativeResult.pause_ratio,
            },
            acoustic_windows: nativeResult.acoustic_windows?.map(w => ({
              window_index: w.window_index,
              time_start: w.time_start,
              time_end: w.time_end,
              pitch_variance_normalized: w.pitch_variance_normalized,
              pause_ratio: w.pause_ratio,
            })) ?? [],
          },
          debugStats: nativeResult.debug_stats ? {
            analyzed_frames: nativeResult.debug_stats.analyzed_frames,
            voiced_frames: nativeResult.debug_stats.voiced_frames,
            duration_seconds: nativeResult.debug_stats.decoded_duration_seconds,
            analysis_duration_ms: nativeResult.debug_stats.analysis_duration_ms,
          } : undefined,
        };
      }
      throw error;
    }

    const extracted = await extractAcousticFeatures(decodedAudio, (stage) => {
      console.log('[DevicePipeline] JS audio metrics extraction progress', {
        sessionId,
        stage,
      });
      onProgress?.(stage);
    });

    console.log('[DevicePipeline] Audio metrics extraction completed', {
      sessionId,
      hasDebugStats: !!extracted.debug_stats,
      acousticWindowCount: extracted.acoustic_windows.length,
      elapsedMs: Date.now() - startedAtMs,
    });

    return {
      payload: {
        session_metadata: {
          session_id: sessionId,
          pipeline: AUDIO_PIPELINE_VERSION.pipeline,
          formula_version: AUDIO_PIPELINE_VERSION.formula,
        },
        acoustic_metrics: extracted.acoustic_metrics,
        acoustic_windows: extracted.acoustic_windows,
      },
      debugStats: extracted.debug_stats,
    };
  } catch (error) {
    console.warn('[DevicePipeline] Audio metrics extraction failed', {
      sessionId,
      audioUri,
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - startedAtMs,
    });
    throw error;
  }
}
