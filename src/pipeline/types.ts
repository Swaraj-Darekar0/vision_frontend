import { PoseLandmarkPayload } from '../types/pose';

export interface DevicePoseJson {
  session_metadata: {
    session_id: string;
    pipeline: string;
    formula_version?: string;
  };
  posture_metrics: {
    shoulder_alignment: number;
    spine_straightness: number;
    posture_openness: number;
    head_stability: number;
    body_sway: number;
    gesture_score: number;
    amplitude_score: number;
    symmetry_score: number;
    fidget_score: number;
    stillness_score: number;
  };
  derived_pose_attributes: {
    posture_stability_index: number;
    pose_confidence: number;
    pose_nervousness: number;
    pose_engagement: number;
    movement_variance_normalized: number;
    gaze_stability: number;
  };
}

export interface DeviceAcousticWindow {
  window_index: number;
  time_start: number;
  time_end: number;
  pitch_variance_normalized: number;
  pause_ratio: number;
}

export interface DeviceAudioAcousticJson {
  session_metadata: {
    session_id: string;
    pipeline: string;
    formula_version?: string;
  };
  acoustic_metrics: {
    pitch_variance_normalized: number;
    jitter_normalized: number;
    energy_variation_normalized: number;
    pause_ratio: number;
  };
  acoustic_windows: DeviceAcousticWindow[];
}

export interface ProcessingSessionCapture {
  landmarkPayload: PoseLandmarkPayload;
  recordedMediaUri: string;
  localVideoUri: string | null;
}

export type AcousticAnalysisProgressStage =
  | 'decoding_audio'
  | 'analyzing_chunks'
  | 'building_windows'
  | 'finalizing_metrics';

export type LocalAnalysisStage =
  | 'preparing'
  | 'pose'
  | 'audio_preprocessing'
  | 'acoustic';

export interface PreparedSessionAnalysisBundle {
  sessionId: string;
  durationSeconds: number;
  transcriptionAudioUri: string;
  transcriptionMediaName: string;
  transcriptionMediaMimeType: string;
  transcriptionAudioGenerated?: boolean;
  poseJson?: DevicePoseJson;
  poseJsonUri?: string;
  audioAcousticJson?: DeviceAudioAcousticJson;
  audioAcousticJsonUri?: string;
  legacyLandmarkUri?: string;
  pipelineVersion: string;
  featureFlagSnapshot: {
    useDevicePosePipeline: boolean;
    useDeviceAcousticPipeline: boolean;
  };
}

export interface AnalyzeRequestMetadata {
  userId?: string;
  topicTitle: string;
  durationLabel: string;
  isFirstSession: boolean;
  isDiagnostic?: boolean;
  planDay?: number;
  planSession?: number;
  targetSkill?: string;
  isRecovery?: boolean;
  weekNumber?: number;
}
