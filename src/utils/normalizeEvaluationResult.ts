import { EvaluationResult, JobResponse } from '../types/api';

function looksLikeEvaluationResult(payload: unknown): payload is EvaluationResult {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as Partial<EvaluationResult>;
  return !!candidate.session_metadata && !!candidate.overall_scores;
}

export function normalizeEvaluationResult(payload: unknown): EvaluationResult {
  if (looksLikeEvaluationResult(payload)) {
    return payload;
  }

  const jobResponse = payload as JobResponse | undefined;
  if (jobResponse?.result && looksLikeEvaluationResult(jobResponse.result)) {
    return jobResponse.result;
  }

  const payloadKeys =
    payload && typeof payload === 'object' ? Object.keys(payload as Record<string, unknown>) : [];

  throw new Error(
    `Unexpected backend response shape. Keys: ${payloadKeys.join(', ') || '(none)'}`,
  );
}
