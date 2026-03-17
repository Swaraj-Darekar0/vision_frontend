import { useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { EvaluationResult, JobResponse } from '../types/api';
import { useAuthStore } from '../store/authStore';
import { useSessionStore } from '../store/sessionStore';
import { saveSession, getSessionList } from '../cache/sessionCache';
import { compressVideoFor480p } from '../utils/compressVideo';
import { formatDurationLabel } from '../utils/formatTime';

export type UploadStatus =
  | 'idle' | 'compressing' | 'uploading' | 'processing' | 'done' | 'error';

const POLL_INTERVAL = 4000; // 4 seconds
const MAX_POLL_TIME = 300000; // 5 minutes

export function useVideoUpload() {
  const { user } = useAuthStore();
  const { setLatestResult } = useSessionStore();

  const [status, setStatus] = useState<UploadStatus>('idle');
  const [compPct, setCompPct] = useState(0);
  const [upPct, setUpPct] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function pollJobStatus(
    jobId: string, 
    topicTitle: string, 
    elapsedSeconds: number,
    compressedUri: string | null
  ): Promise<boolean> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const poll = async () => {
        // ... timeout check ...
        if (Date.now() - startTime > MAX_POLL_TIME) {
          setStatus('error');
          setError('Analysis timed out. The server is taking too long.');
          resolve(false);
          return;
        }

        try {
          const response = await apiClient.get<JobResponse>(ENDPOINTS.jobStatus(jobId));
          const { status: jobStatus, result, error: jobError } = response.data;

          console.log(`[Poll] Job ${jobId} status:`, jobStatus);

          if (jobStatus === 'done' && result) {
            // Success!
            if (user?.id) {
              await saveSession(result, elapsedSeconds, topicTitle, user.id, compressedUri);
            }
            setLatestResult(result, compressedUri);
            setStatus('done');
            resolve(true);
          } else if (jobStatus === 'error') {
            setStatus('error');
            setError(jobError || 'Analysis failed on the server.');
            resolve(false);
          } else if (jobStatus === 'not_found') {
            setStatus('error');
            setError('Job lost. Please try uploading again.');
            resolve(false);
          } else {
            // Still processing, continue polling
            setTimeout(poll, POLL_INTERVAL);
          }
        } catch (err: any) {
          console.error('[Poll] request failed:', err);
          setTimeout(poll, POLL_INTERVAL);
        }
      };

      poll();
    });
  }

  async function uploadVideo(
    rawVideoUri: string,
    topicTitle: string,
    elapsedSeconds: number,
  ): Promise<boolean> {
    let compressedUri: string | null = null;
    try {
      setError(null);

      // Step 1: Compress
      setStatus('compressing');
      setCompPct(0);
      const { uri } = await compressVideoFor480p(rawVideoUri, setCompPct);
      compressedUri = uri;

      // Step 2: Upload (Immediate response with job_id)
      setStatus('uploading');
      setUpPct(0);
      
      const formData = new FormData();
      const cleanUri = uri.startsWith('file://') ? uri : `file://${uri}`;

      // @ts-ignore
      formData.append('video', {
        uri: cleanUri,
        name: 'session.mp4',
        type: 'video/mp4',
      });
      
      if (user?.id) {
        formData.append('user_id', user.id);
      }

      formData.append('topic_title', topicTitle);
      formData.append('duration_label', formatDurationLabel(elapsedSeconds));
      
      const existingSessions = user?.id ? await getSessionList(user.id) : [];
      formData.append('is_first_session', (existingSessions.length === 0).toString());

      const response = await apiClient.post<{ job_id: string }>(
        ENDPOINTS.analyzeFullVideo,
        formData,
        {
          headers: { 
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json'
          },
          onUploadProgress: (evt) => {
            if (evt.total) {
              const pct = Math.round((evt.loaded / evt.total) * 100);
              setUpPct(pct);
              if (pct >= 100) setStatus('processing');
            }
          },
        },
      );

      const { job_id } = response.data;

      // Step 3: Cleanup raw video (Keep compressedUri for the timeline)
      try {
        await FileSystem.deleteAsync(rawVideoUri, { idempotent: true });
      } catch (e) {
        console.warn('Cleanup failed:', e);
      }

      // Step 4: Start Polling
      return await pollJobStatus(job_id, topicTitle, elapsedSeconds, compressedUri);

    } catch (err: any) {
      console.error('[Upload] submission failed:', err);
      // Cleanup compressed file if upload failed
      if (compressedUri) {
        await FileSystem.deleteAsync(compressedUri, { idempotent: true }).catch(() => {});
      }
      setStatus('error');
      setError(err?.response?.data?.error ?? err?.message ?? 'Upload failed. Please check your connection.');
      return false;
    }
  }


  return { uploadVideo, status, compPct, upPct, error };
}
