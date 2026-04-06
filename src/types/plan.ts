export type SpeakerLevel = 'developing' | 'competent' | 'advanced';

export interface PlanTopicResources {
  hint: string;
  research_prompt: string | null;
  youtube_search: string | null;
}

export type PlanTargetSkill =
  | 'pacing'
  | 'filler_words'
  | 'confidence'
  | 'clarity'
  | 'engagement'
  | 'structure'
  | 'authority';

export interface PlanTopic {
  day: number;
  session: number;
  tier: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4';
  topic_title: string;
  target_skill: PlanTargetSkill;
  duration_minutes: number;
  completed: boolean;
  completed_at: string | null;
  session_id: string | null;
  resources: PlanTopicResources;
}

export interface WeeklyPlan {
  plan_id: string;
  week_number: number;
  week_start_date: string;
  sessions_per_day: number;
  speaker_level: SpeakerLevel;
  topics: PlanTopic[];
  generated_at: string;
}

export interface WeeklyReview {
  week_number: number;
  completion_rate: number;
  avg_overall_score: number;
  avg_confidence?: number;
  avg_clarity?: number;
  avg_engagement?: number;
  avg_nervousness?: number;
  weakest_metric: string;
  strongest_metric: string;
  missed_days: number[];
  review_narrative: string;
  shown_to_user?: boolean;
}

export interface UserPersonalizationProfile {
  identity: string | null;
  work_domain: string | null;
  interest_areas: string[];
  speaking_goal: string | null;
  practice_frequency: string | null;
}

export interface PlanContext {
  speaker_level: SpeakerLevel;
  current_week: number;
  tier: string;
  sessions_this_week: number;
  performance_last_week: {
    completion_rate: number;
    avg_overall_score: number;
    weakest_metric: string;
    strongest_metric: string;
  } | null;
}
