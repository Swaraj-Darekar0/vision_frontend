import { EvaluationResult, JobResponse } from '../types/api';

const STABLE_DELTA = { change: 0, label: 'Stable' } as const;

function withSafeProgressComparison(result: EvaluationResult): EvaluationResult {
  const deltas = result.progress_comparison?.deltas ?? {};

  return {
    ...result,
    progress_comparison: {
      headline: result.progress_comparison?.headline ?? 'Baseline Session',
      is_first_session: result.progress_comparison?.is_first_session ?? true,
      deltas: {
        overall: deltas.overall ?? STABLE_DELTA,
        confidence: deltas.confidence ?? STABLE_DELTA,
        clarity: deltas.clarity ?? STABLE_DELTA,
        engagement: deltas.engagement ?? STABLE_DELTA,
        nervousness: deltas.nervousness ?? STABLE_DELTA,
        behavioral: {
          filler_reduction: deltas.behavioral?.filler_reduction ?? STABLE_DELTA,
          pause_optimization: deltas.behavioral?.pause_optimization ?? STABLE_DELTA,
          posture_stability: deltas.behavioral?.posture_stability ?? STABLE_DELTA,
        },
      },
    },
  };
}

function looksLikeEvaluationResult(payload: unknown): payload is EvaluationResult {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as Partial<EvaluationResult>;
  return !!candidate.session_metadata && !!candidate.overall_scores;
}

export function normalizeEvaluationResult(payload: unknown): EvaluationResult {
  if (looksLikeEvaluationResult(payload)) {
    return withSafeProgressComparison(payload);
  }

  const jobResponse = payload as JobResponse | undefined;
  if (jobResponse?.result && looksLikeEvaluationResult(jobResponse.result)) {
    return withSafeProgressComparison(jobResponse.result);
  }

  const payloadKeys =
    payload && typeof payload === 'object' ? Object.keys(payload as Record<string, unknown>) : [];

  throw new Error(
    `Unexpected backend response shape. Keys: ${payloadKeys.join(', ') || '(none)'}`,
  );
}
