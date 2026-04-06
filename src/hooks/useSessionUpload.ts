import { useCallback, useState } from 'react';
import * as Notifications from 'expo-notifications';
import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { useSessionStore } from '../store/sessionStore';
import { saveSession, getSessionList } from '../cache/sessionCache';
import { enqueueSession } from '../cache/offlineQueue';
import { normalizeEvaluationResult } from '../utils/normalizeEvaluationResult';
import { waitForEvaluationJob } from '../utils/waitForEvaluationJob';
import { formatDurationLabel } from '../utils/formatTime';
import { buildAnalysisFormData } from '../pipeline/buildAnalysisFormData';
import { PreparedSessionAnalysisBundle } from '../pipeline/types';
import { cleanupPreparedSessionAnalysisBundle } from '../pipeline/prepareSessionAnalysisBundle';

export type UploadStatus =
  | 'idle' | 'uploading' | 'processing' | 'done' | 'error';
export type UploadResult = 'uploaded' | 'queued' | false;

export function useSessionUpload() {
  const { user } = useAuthStore();
  const { setLatestResult } = useSessionStore();

  const [status, setStatus] = useState<UploadStatus>('idle');
  const [upPct, setUpPct] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const promoteUploadProgress = useCallback((nextPct: number) => {
    setUpPct((current) => Math.max(current, Math.min(100, nextPct)));
  }, []);

  const uploadSession = useCallback(async (
    bundle: PreparedSessionAnalysisBundle,
    topicTitle: string,
    localVideoUri: string | null = null,
    meta?: {
      isDiagnostic?: boolean;
      planDay?: number;
      planSession?: number;
      targetSkill?: string;
      isRecovery?: boolean;
      weekNumber?: number;
    },
  ): Promise<UploadResult> => {
    try {
      console.log('[SessionUpload] Starting upload', {
        sessionId: bundle.sessionId,
        durationSeconds: bundle.durationSeconds,
        audioUri: bundle.transcriptionAudioUri,
        audioMimeType: bundle.transcriptionMediaMimeType,
        generatedAudioArtifact: !!bundle.transcriptionAudioGenerated,
        topicTitle,
        devicePose: !!bundle.poseJsonUri,
        deviceAudio: !!bundle.audioAcousticJsonUri,
      });
      setError(null);
      setStatus('uploading');
      setUpPct(0);

      const existingSessions = user?.id ? await getSessionList(user.id) : [];
      const form = buildAnalysisFormData(bundle, {
        userId: user?.id,
        topicTitle,
        durationLabel: formatDurationLabel(bundle.durationSeconds),
        isFirstSession: existingSessions.length === 0,
        isDiagnostic: meta?.isDiagnostic,
        planDay: meta?.planDay,
        planSession: meta?.planSession,
        targetSkill: meta?.targetSkill,
        isRecovery: meta?.isRecovery,
        weekNumber: meta?.weekNumber,
      });
      console.log('[SessionUpload] Dispatching multipart request', {
        endpoint: ENDPOINTS.analyzeFullVideo,
        isFirstSession: existingSessions.length === 0,
      });
      promoteUploadProgress(4);

      const response = await apiClient.post(
        ENDPOINTS.analyzeFullVideo,
        form,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            if (evt.total && evt.total > 0) {
              const pct = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
              promoteUploadProgress(pct);
              console.log('[SessionUpload] Upload progress', {
                loaded: evt.loaded,
                total: evt.total,
                pct,
              });
              if (pct >= 100) setStatus('processing');
            } else if (evt.loaded > 0) {
              promoteUploadProgress(12);
              console.log('[SessionUpload] Upload progress without total', {
                loaded: evt.loaded,
              });
            }
          },
        },
      );
      console.log('[SessionUpload] Upload request completed', {
        sessionId: bundle.sessionId,
        httpStatus: response.status,
        receivedJobId: !!response.data?.job_id,
      });

      console.log('[SessionUpload] Backend response shape', {
        keys:
          response.data && typeof response.data === 'object'
            ? Object.keys(response.data)
            : [],
      });

      let result;
      if (response.data?.job_id) {
        console.log('[SessionUpload] Job accepted by backend', {
          jobId: response.data.job_id,
          sessionId: response.data.session_id,
        });
        promoteUploadProgress(100);
        setStatus('processing');
        result = await waitForEvaluationJob(response.data.job_id);
        console.log('[SessionUpload] Backend job completed', {
          jobId: response.data.job_id,
          sessionId: result.session_metadata.session_id,
        });
      } else {
        promoteUploadProgress(100);
        result = normalizeEvaluationResult(response.data);
        console.log('[SessionUpload] Upload completed without async job', {
          sessionId: result.session_metadata.session_id,
        });
      }

      console.log('[SessionUpload] Backend response received', {
        hasResult: !!result,
        sessionId: result.session_metadata.session_id,
      });
      
      // Save to cache
      if (user?.id) {
        await saveSession(result, bundle.durationSeconds, topicTitle, user.id, localVideoUri);
        console.log('[SessionUpload] Result cached locally', {
          sessionId: result.session_metadata.session_id,
          userId: user.id,
        });
      }
      
      setLatestResult(result, localVideoUri);
      await cleanupPreparedSessionAnalysisBundle(bundle);
      console.log('[SessionUpload] Session upload flow completed successfully', {
        sessionId: result.session_metadata.session_id,
      });
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Vision',
          body: 'Your session data is ready.',
          data: { sessionId: result.session_metadata.session_id },
        },
        trigger: null,
      });

      setStatus('done');
      return 'uploaded';
    } catch (err: any) {
      console.error('[SessionUpload] failed:', err);

      const shouldQueue =
        !!user?.id &&
        !err?.response &&
        !!bundle?.sessionId;

      if (shouldQueue) {
        try {
          await enqueueSession({
            id: bundle.sessionId,
            poseJsonUri: bundle.poseJsonUri,
            audioAcousticJsonUri: bundle.audioAcousticJsonUri,
            transcriptionAudioUri: bundle.transcriptionAudioUri,
            landmarkUri: bundle.legacyLandmarkUri,
            mediaName: bundle.transcriptionMediaName,
            mediaMimeType: bundle.transcriptionMediaMimeType,
            topicTitle,
            elapsedSeconds: bundle.durationSeconds,
            isDiagnostic: meta?.isDiagnostic,
            planDay: meta?.planDay,
            planSession: meta?.planSession,
            targetSkill: meta?.targetSkill,
            isRecovery: meta?.isRecovery,
            weekNumber: meta?.weekNumber,
            pipelineVersion: bundle.pipelineVersion,
            featureFlagSnapshot: bundle.featureFlagSnapshot,
            queuedAt: new Date().toISOString(),
          });

          console.log('[SessionUpload] Upload queued for retry', {
            sessionId: bundle.sessionId,
          });

          setStatus('idle');
          setError(null);
          return 'queued';
        } catch (queueError: any) {
          console.error('[SessionUpload] queue fallback failed:', queueError);
          setError(queueError?.message ?? 'Upload failed and offline queue is unavailable');
          setStatus('error');
          return false;
        }
      }

      setStatus('error');
      setError(err?.response?.data?.error ?? err?.message ?? 'Upload failed');
      return false;
    }
  }, [promoteUploadProgress, setLatestResult, user?.id]);

  return { uploadSession, status, upPct, error };
}
