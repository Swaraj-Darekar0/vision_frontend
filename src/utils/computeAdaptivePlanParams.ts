import { PLAN } from '../theme/constants';
import { PlanContext } from '../types/plan';

export function computeAdaptivePlanParams(planContext: PlanContext) {
  const lastWeek = planContext.performance_last_week;

  let sessionsPerDay = Math.min(2, PLAN.SESSIONS_MAX);
  let durationMinutes = 2;

  if (!lastWeek) {
    return {
      sessionsPerDay,
      durationMinutes,
      tier: 'tier_1',
    };
  }

  sessionsPerDay = Math.round(planContext.sessions_this_week / 7) || 1;

  if (
    lastWeek.completion_rate >= PLAN.ESCALATION_COMPLETION &&
    lastWeek.avg_overall_score >= 0.55
  ) {
    sessionsPerDay = Math.min(PLAN.SESSIONS_MAX, sessionsPerDay + 1);
    durationMinutes = Math.min(PLAN.DURATION_MAX_MINUTES, durationMinutes + 1);
  } else if (
    lastWeek.completion_rate < PLAN.DEESCALATION_COMPLETION ||
    lastWeek.avg_overall_score <= 0.4
  ) {
    sessionsPerDay = Math.max(PLAN.SESSIONS_MIN, sessionsPerDay - 1);
    durationMinutes = Math.max(PLAN.DURATION_MIN_MINUTES, durationMinutes - 1);
  }

  const tier =
    lastWeek.avg_overall_score >= 0.75
      ? 'tier_4'
      : lastWeek.avg_overall_score >= 0.6
      ? 'tier_3'
      : lastWeek.avg_overall_score >= 0.45
      ? 'tier_2'
      : 'tier_1';

  return {
    sessionsPerDay,
    durationMinutes,
    tier,
  };
}
