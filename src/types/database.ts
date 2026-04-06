// Based on your specific Supabase schemas

export interface UserProfile {
  id:           string;   // uuid
  display_name: string | null;
  speaking_goals: string[] | null;
  identity?: string | null;
  work_domain?: string | null;
  interest_areas?: string[] | null;
  speaking_goal?: string | null;
  practice_frequency?: string | null;
  speaker_level?: 'developing' | 'competent' | 'advanced' | null;
  subscription_status?: 'free' | 'active' | 'expired' | null;
  subscription_plan?: 'weekly' | 'monthly' | null;
  subscription_start?: string | null;
  subscription_end?: string | null;
  onboarding_complete?: boolean | null;
  diagnostic_complete?: boolean | null;
  updated_at:   string | null;
}

export interface SessionScore {
  session_id:                 string;
  user_id:                    string;   // uuid
  session_date:               string | null;
  confidence:                 number | null;  // real
  clarity:                    number | null;
  engagement:                 number | null;
  nervousness:                number | null;
  overall:                    number | null;
  filler_ratio:               number | null;
  pitch_variance_normalized:  number | null;
  posture_stability_index:    number | null;
  pause_ratio:                number | null;
  gesture_score:              number | null;
}
