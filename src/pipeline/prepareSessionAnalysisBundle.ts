import * as FileSystem from 'expo-file-system/legacy';
import { DEVICE_PIPELINE_FLAGS, DEVICE_PIPELINE_VERSION } from './config/devicePipelineConfig';
import { buildAudioAcousticJson } from './audio/buildAudioAcousticJson';
import { preprocessAudioForUpload } from './audio/preprocessAudioForUpload';
import { buildPoseJson } from './pose/buildPoseJson';
import {
  AcousticAnalysisProgressStage,
  LocalAnalysisStage,
  PreparedSessionAnalysisBundle,
  ProcessingSessionCapture,
} from './types';

async function writeJsonArtifact(prefix: string, sessionId: string, payload: unknown): Promise<string> {
  const path = `${FileSystem.cacheDirectory}${prefix}_${sessionId}.json`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(payload));
  return path;
}

export async function prepareSessionAnalysisBundle(
  capture: ProcessingSessionCapture,
  onStageChange?: (
    stage: LocalAnalysisStage,
    acousticDetail?: AcousticAnalysisProgressStage | null,
  ) => void,
): Promise<PreparedSessionAnalysisBundle> {
  const { landmarkPayload, recordedMediaUri } = capture;
  console.log('[DevicePipeline] Bundle preparation started', {
    sessionId: landmarkPayload.session_id,
    recordedMediaUri,
    durationSeconds: landmarkPayload.duration_seconds,
  });

  onStageChange?.('preparing', null);

  onStageChange?.('audio_preprocessing', null);
  const { transcriptionAudioUri, transcriptionMediaName, transcriptionMediaMimeType, generatedArtifact } =
    await preprocessAudioForUpload(recordedMediaUri);
  console.log('[DevicePipeline] Audio preprocessing stage completed', {
    sessionId: landmarkPayload.session_id,
    transcriptionAudioUri,
    transcriptionMediaName,
    transcriptionMediaMimeType,
    generatedArtifact: !!generatedArtifact,
  });

  let poseJsonUri: string | undefined;
  let legacyLandmarkUri: string | undefined;
  let poseJson = undefined;

  if (DEVICE_PIPELINE_FLAGS.useDevicePosePipeline) {
    onStageChange?.('pose', null);
    poseJson = buildPoseJson(landmarkPayload);
    poseJsonUri = await writeJsonArtifact('pose', landmarkPayload.session_id, poseJson);
    console.log('[DevicePipeline] Pose metrics stage completed', {
      sessionId: landmarkPayload.session_id,
      poseJsonUri,
    });
  } else {
    legacyLandmarkUri = await writeJsonArtifact('landmarks', landmarkPayload.session_id, landmarkPayload);
    console.log('[DevicePipeline] Legacy landmark package prepared', {
      sessionId: landmarkPayload.session_id,
      legacyLandmarkUri,
    });
  }

  let audioAcousticJsonUri: string | undefined;
  let audioAcousticJson = undefined;
  const shouldUseDeviceAcousticPipeline = DEVICE_PIPELINE_FLAGS.useDeviceAcousticPipeline;

  if (shouldUseDeviceAcousticPipeline) {
    try {
      onStageChange?.('acoustic', 'decoding_audio');
      const audioBuildResult = await buildAudioAcousticJson(
        landmarkPayload.session_id,
        transcriptionAudioUri,
        (detailStage) => onStageChange?.('acoustic', detailStage),
      );
      audioAcousticJson = audioBuildResult.payload;
      audioAcousticJsonUri = await writeJsonArtifact(
        'audio_acoustic',
        landmarkPayload.session_id,
        audioAcousticJson,
      );
      console.log('[DevicePipeline] Acoustic metrics stage completed', {
        sessionId: landmarkPayload.session_id,
        audioAcousticJsonUri,
        analyzedAudioUri: transcriptionAudioUri,
      });
      if (audioBuildResult.debugStats) {
        console.log('[DevicePipeline] Acoustic analysis debug', {
          sessionId: landmarkPayload.session_id,
          ...audioBuildResult.debugStats,
        });
      }
    } catch (error) {
      console.warn('[DevicePipeline] Falling back to backend acoustic extraction', {
        sessionId: landmarkPayload.session_id,
        analyzedAudioUri: transcriptionAudioUri,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    console.log('[DevicePipeline] Acoustic metrics stage skipped', {
      sessionId: landmarkPayload.session_id,
      deviceFlagEnabled: DEVICE_PIPELINE_FLAGS.useDeviceAcousticPipeline,
    });
  }

  const bundle = {
    sessionId: landmarkPayload.session_id,
    durationSeconds: landmarkPayload.duration_seconds,
    transcriptionAudioUri,
    transcriptionMediaName,
    transcriptionMediaMimeType,
    transcriptionAudioGenerated: generatedArtifact,
    poseJson,
    poseJsonUri,
    audioAcousticJson,
    audioAcousticJsonUri,
    legacyLandmarkUri,
    pipelineVersion: DEVICE_PIPELINE_VERSION.formula,
    featureFlagSnapshot: {
      useDevicePosePipeline: DEVICE_PIPELINE_FLAGS.useDevicePosePipeline,
      useDeviceAcousticPipeline: !!audioAcousticJsonUri,
    },
  };

  console.log('[DevicePipeline] Bundle preparation completed', {
    sessionId: bundle.sessionId,
    hasPoseJson: !!bundle.poseJsonUri,
    hasLegacyLandmarks: !!bundle.legacyLandmarkUri,
    hasAudioAcousticJson: !!bundle.audioAcousticJsonUri,
    transcriptionAudioGenerated: !!bundle.transcriptionAudioGenerated,
  });

  return bundle;
}

export async function cleanupPreparedSessionAnalysisBundle(bundle: PreparedSessionAnalysisBundle): Promise<void> {
  const cleanupTargets = [
    bundle.transcriptionAudioGenerated ? bundle.transcriptionAudioUri : undefined,
    bundle.poseJsonUri,
    bundle.audioAcousticJsonUri,
    bundle.legacyLandmarkUri,
  ].filter((target): target is string => !!target);

  console.log('[DevicePipeline] Bundle cleanup started', {
    sessionId: bundle.sessionId,
    cleanupTargetCount: cleanupTargets.length,
  });
  await Promise.all(
    cleanupTargets.map((target) => FileSystem.deleteAsync(target, { idempotent: true }).catch(() => {}))
  );
  console.log('[DevicePipeline] Bundle cleanup completed', {
    sessionId: bundle.sessionId,
    cleanupTargetCount: cleanupTargets.length,
  });
}
