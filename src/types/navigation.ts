import { EvaluationResult } from './api';
import { ProcessingSessionCapture } from '../pipeline/types';

export type RootStackParamList = {
  Login:             undefined;
  Signup:            undefined;
  Welcome:           undefined;
  Dashboard:         undefined;
  Profile:           undefined;
  DiagnosticEntry:   undefined;
  PostAssessment:    { result?: EvaluationResult } | undefined;
  PersonalizationOnboarding: undefined;
  Paywall:           { source?: 'dashboard' | 'post_assessment' } | undefined;
  WeeklyReview:      { weekNumber: number };
  Recording:         {
    topicTitle: string;
    minDurationSeconds?: number;
    isDiagnostic?: boolean;
    planDay?: number;
    planSession?: number;
    targetSkill?: string;
    isRecovery?: boolean;
    weekNumber?: number;
  };
  Processing:        { 
    capture: ProcessingSessionCapture;
    isDiagnostic?: boolean;
    planDay?: number;
    planSession?: number;
    targetSkill?: string;
    isRecovery?: boolean;
    weekNumber?: number;
  };
  Results:           undefined;
  SessionHistory:    undefined;
  SessionDetail:     { sessionId: string };
};
