import { AnalyzeRequestMetadata, PreparedSessionAnalysisBundle } from './types';

export function buildAnalysisFormData(
  bundle: PreparedSessionAnalysisBundle,
  metadata: AnalyzeRequestMetadata,
): FormData {
  console.log('[SessionUpload] Building upload package', {
    sessionId: bundle.sessionId,
    hasPoseJson: !!bundle.poseJsonUri,
    hasLegacyLandmarks: !!bundle.legacyLandmarkUri,
    hasAudioAcousticJson: !!bundle.audioAcousticJsonUri,
    audioName: bundle.transcriptionMediaName,
    audioMimeType: bundle.transcriptionMediaMimeType,
  });
  const form = new FormData();

  if (bundle.poseJsonUri) {
    // @ts-ignore
    form.append('pose_json', {
      uri: bundle.poseJsonUri,
      name: 'pose.json',
      type: 'application/json',
    });
  } else if (bundle.legacyLandmarkUri) {
    // @ts-ignore
    form.append('pose_landmarks', {
      uri: bundle.legacyLandmarkUri,
      name: 'landmarks.json',
      type: 'application/json',
    });
  }

  if (bundle.audioAcousticJsonUri) {
    // @ts-ignore
    form.append('audio_acoustic_json', {
      uri: bundle.audioAcousticJsonUri,
      name: 'audio-acoustic.json',
      type: 'application/json',
    });
  }

  // @ts-ignore
  form.append('audio', {
    uri: bundle.transcriptionAudioUri,
    name: bundle.transcriptionMediaName,
    type: bundle.transcriptionMediaMimeType,
  });

  if (metadata.userId) {
    form.append('user_id', metadata.userId);
  }

  form.append('session_id', bundle.sessionId);
  form.append('topic_title', metadata.topicTitle);
  form.append('duration_label', metadata.durationLabel);
  form.append('is_first_session', String(metadata.isFirstSession));

  if (metadata.isDiagnostic) {
    form.append('is_diagnostic', 'true');
  }
  if (typeof metadata.planDay === 'number') {
    form.append('plan_day', String(metadata.planDay));
  }
  if (typeof metadata.planSession === 'number') {
    form.append('plan_session_num', String(metadata.planSession));
  }
  if (metadata.targetSkill) {
    form.append('target_skill', metadata.targetSkill);
  }
  if (metadata.isRecovery) {
    form.append('is_recovery', 'true');
  }
  if (typeof metadata.weekNumber === 'number') {
    form.append('week_number', String(metadata.weekNumber));
  }

  console.log('[SessionUpload] Upload package ready', {
    sessionId: bundle.sessionId,
    topicTitle: metadata.topicTitle,
    durationLabel: metadata.durationLabel,
  });

  return form;
}
