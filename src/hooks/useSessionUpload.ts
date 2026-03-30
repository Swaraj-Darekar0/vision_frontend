import { useCallback, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { PoseLandmarkPayload } from '../types/pose';
import { useAuthStore } from '../store/authStore';
import { useSessionStore } from '../store/sessionStore';
import { saveSession, getSessionList } from '../cache/sessionCache';
import { normalizeEvaluationResult } from '../utils/normalizeEvaluationResult';
import { waitForEvaluationJob } from '../utils/waitForEvaluationJob';
import { formatDurationLabel } from '../utils/formatTime';

export type UploadStatus =
  | 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export function useSessionUpload() {
  const { user } = useAuthStore();
  const { setLatestResult } = useSessionStore();

  const [status, setStatus] = useState<UploadStatus>('idle');
  const [upPct, setUpPct] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadSession = useCallback(async (
    landmarkPayload: PoseLandmarkPayload,
    audioUri: string,
    topicTitle: string,
    localVideoUri: string | null = null,
  ): Promise<boolean> => {
    try {
      console.log('[SessionUpload] Starting upload', {
        totalFrames: landmarkPayload.total_frames,
        durationSeconds: landmarkPayload.duration_seconds,
        audioUri,
        topicTitle,
      });
      setError(null);
      setStatus('uploading');
      setUpPct(0);

      const form = new FormData();
      
      // Serialize landmark JSON to a file
      const tempJsonPath = `${FileSystem.cacheDirectory}landmarks_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(tempJsonPath, JSON.stringify(landmarkPayload));
      console.log('[SessionUpload] Landmark payload written to temp file', {
        tempJsonPath,
      });

      // @ts-ignore
      form.append('pose_landmarks', {
        uri: tempJsonPath,
        name: 'landmarks.json',
        type: 'application/json',
      });

      // @ts-ignore
      form.append('audio', {
        uri: audioUri,
        name: localVideoUri && audioUri === localVideoUri ? 'session.mp4' : 'audio.m4a',
        type: localVideoUri && audioUri === localVideoUri ? 'video/mp4' : 'audio/mp4',
      });

      if (user?.id) {
        form.append('user_id', user.id);
      }
      form.append('session_id', landmarkPayload.session_id);
      form.append('topic_title', topicTitle);
      form.append('duration_label', formatDurationLabel(landmarkPayload.duration_seconds));
      
      const existingSessions = user?.id ? await getSessionList(user.id) : [];
      form.append('is_first_session', (existingSessions.length === 0).toString());
      console.log('[SessionUpload] Dispatching multipart request', {
        endpoint: ENDPOINTS.analyzeFullVideo,
        isFirstSession: existingSessions.length === 0,
      });

      const response = await apiClient.post(
        ENDPOINTS.analyzeFullVideo,
        form,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            if (evt.total) {
              const pct = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
              setUpPct(pct);
              console.log('[SessionUpload] Upload progress', {
                loaded: evt.loaded,
                total: evt.total,
                pct,
              });
              if (pct >= 100) setStatus('processing');
            }
          },
        },
      );

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
        setStatus('processing');
        result = await waitForEvaluationJob(response.data.job_id);
      } else {
        result = normalizeEvaluationResult(response.data);
      }

      console.log('[SessionUpload] Backend response received', {
        hasResult: !!result,
        sessionId: result.session_metadata.session_id,
      });
      
      // Save to cache
      if (user?.id) {
        await saveSession(result, landmarkPayload.duration_seconds, topicTitle, user.id, localVideoUri);
      }
      
      setLatestResult(result, localVideoUri);

      // Cleanup
      await FileSystem.deleteAsync(tempJsonPath, { idempotent: true }).catch(() => {});
      if (audioUri && audioUri !== localVideoUri) {
        await FileSystem.deleteAsync(audioUri, { idempotent: true }).catch(() => {});
      }
      console.log('[SessionUpload] Temp files cleaned up');

      setStatus('done');
      return true;
    } catch (err: any) {
      console.error('[SessionUpload] failed:', err);
      setStatus('error');
      setError(err?.response?.data?.error ?? err?.message ?? 'Upload failed');
      return false;
    }
  }, [setLatestResult, user?.id]);

  return { uploadSession, status, upPct, error };
}
