import { decodeAudioFile } from '../../audio/audioFileDecoder';
import { extractAcousticFeatures } from '../../audio/acousticExtractor';
import { AUDIO_PIPELINE_VERSION } from '../../audio/audioConstants';
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
  });
  const startedAtMs = Date.now();

  try {
    onProgress?.('decoding_audio');
    const decodedAudio = await decodeAudioFile(audioUri);
    const extracted = await extractAcousticFeatures(decodedAudio, (stage) => {
      console.log('[DevicePipeline] Audio metrics extraction progress', {
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
