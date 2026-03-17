// Based on your specific Supabase schemas

export interface UserProfile {
  id:           string;   // uuid
  display_name: string | null;
  speaking_goals: string[] | null;
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
