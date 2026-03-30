// Timestamp events from backend
export interface TimestampEvent {
  event:      string;   // 'rapid_speech_segment' | 'monotone_segment' | 'vocal_instability_spike' | 'excessive_pause'
  time_start: number;   // seconds
  time_end:   number;
}

export interface TimestampedMoment {
  time: string;   // 'MM:SS'
  note: string;
}

export interface LLMFeedback {
  overall_summary:                  string;
  progress_narrative:               string;
  topical_relevance_analysis:       string;
  timestamped_moments:              TimestampedMoment[];
  top_3_action_items:               string[];
  motivational_closing:             string;
  one_line_headline_mistakes:       string;    // NEW
  suggest_next_presentation_topics: string | string[];  // Can be string or array
}

export interface OverallScores {
  clarity:     number;   // [0, 1]
  confidence:  number;
  engagement:  number;
  nervousness: number;
  overall:     number;
}

export type DeltaLabel =
  | 'Stable'
  | 'Noticeable Decline'
  | 'Significant Decline'
  | 'Noticeable Improvement'
  | 'Significant Improvement';

export interface DeltaEntry {
  change: number;
  label:  DeltaLabel;
}

export interface ProgressComparison {
  headline:         string;
  is_first_session: boolean;
  deltas: {
    overall:     DeltaEntry;
    confidence:  DeltaEntry;
    clarity:     DeltaEntry;
    engagement:  DeltaEntry;
    nervousness: DeltaEntry;
    behavioral: {
      filler_reduction:   DeltaEntry;
      pause_optimization: DeltaEntry;
      posture_stability:  DeltaEntry;
    };
  };
}

export interface AudioMetrics {
  energy_variation_normalized:        number;
  filler_ratio:                       number;
  jitter_normalized:                  number;
  pause_ratio:                        number;
  pitch_variance_normalized:          number;
  speech_rate_instability_normalized: number;
  speech_rate_score:                  number;
  speech_rate_wpm:                    number;
}

export interface PoseMetrics {
  amplitude_score:    number;
  body_sway:          number;
  fidget_score:       number;
  gesture_score:      number;
  head_stability:     number;
  posture_openness:   number;
  shoulder_alignment: number;
  spine_straightness: number;
  stillness_score:    number;
  symmetry_score:     number;
}

export interface RawMetricsSnapshot {
  audio: AudioMetrics;
  pose:  PoseMetrics;
}

export interface SessionMetadata {
  is_first_session: boolean;
  processed_at:     string;   // ISO 8601 UTC
  session_id:       string;   // UUID
  user_id:          string;   // UUID
  topic_title:      string;    // NEW
  duration_label:   string;    // NEW
}

export interface EvaluationResult {
  llm_feedback:         LLMFeedback;
  overall_scores:       OverallScores;
  progress_comparison:  ProgressComparison;
  raw_metrics_snapshot: RawMetricsSnapshot;
  session_metadata:     SessionMetadata;
  timestamp_events:     TimestampEvent[];
  filler_words_used:    Record<string, number>;   // NEW
  transcript: {                                   // NEW
    full_text:   string;
    total_words: number;
    segments: Array<{
      start: number;
      end:   number;
      text:  string;
    }>;
  };
}

export type JobStatus = 'processing' | 'done' | 'error' | 'not_found';

export interface JobResponse {
  status: JobStatus;
  result?: EvaluationResult;
  error?: string;
}
