import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { EvaluationResult, JobResponse } from '../types/api';
import { normalizeEvaluationResult } from './normalizeEvaluationResult';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 180;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForEvaluationJob(jobId: string): Promise<EvaluationResult> {
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt += 1) {
    const response = await apiClient.get<JobResponse>(ENDPOINTS.jobStatus(jobId));
    const job = response.data;

    console.log('[SessionUpload] Job poll response', {
      attempt,
      jobId,
      status: job?.status,
      hasResult: !!job?.result,
    });

    if (job?.status === 'done' && job.result) {
      return normalizeEvaluationResult(job.result);
    }

    if (job?.status === 'error') {
      throw new Error(job.error || 'Backend analysis failed.');
    }

    if (job?.status === 'not_found') {
      throw new Error('Backend job was not found.');
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error('Timed out while waiting for backend analysis.');
}
