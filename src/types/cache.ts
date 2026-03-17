export interface SessionListEntry {
  sessionId:        string;
  processedAt:      string;    // ISO 8601
  overallScore:     number;    // [0, 1] — for streak color
  confidenceScore:  number;    // [0, 1] — for Dashboard Confidence card
  clarityScore:     number;    // [0, 1]
  engagementScore:  number;    // [0, 1]
  nervousnessScore: number;    // [0, 1]
  topicTitle:      string;
  durationLabel:   string;    // e.g., "14m 23s"
  isFirstSession:  boolean;
  localVideoUri?:  string | null;  // null for sessions older than rolling window of 3
  }
