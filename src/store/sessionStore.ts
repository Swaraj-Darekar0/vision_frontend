// src/store/sessionStore.ts
import { create } from 'zustand';
import { EvaluationResult } from '../types/api';
import { SessionListEntry } from '../types/cache';

interface SessionStore {
  latestResult:     EvaluationResult | null;
  latestSessionSummary: SessionListEntry | null;
  elapsedSeconds:   number;
  topicTitle:       string;
  localVideoUri:    string | null;
  isDiagnostic:     boolean;
  planDay:          number | null;
  planSession:      number | null;
  targetSkill:      string | null;
  weekNumber:       number | null;
  setLatestResult:  (r: EvaluationResult, localUri?: string | null) => void;
  setLatestSessionSummary: (entry: SessionListEntry | null) => void;
  setRecordingMeta: (elapsed: number, topic: string, context?: {
    isDiagnostic?: boolean;
    planDay?: number;
    planSession?: number;
    targetSkill?: string;
    weekNumber?: number;
  }) => void;
  clear:            () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  latestResult:     null,
  latestSessionSummary: null,
  elapsedSeconds:   0,
  topicTitle:       '',
  localVideoUri:    null,
  isDiagnostic:     false,
  planDay:          null,
  planSession:      null,
  targetSkill:      null,
  weekNumber:       null,
  setLatestResult:  (r, localUri) => set({ latestResult: r, localVideoUri: localUri ?? null }),
  setLatestSessionSummary: (entry) => set({ latestSessionSummary: entry }),
  setRecordingMeta: (elapsed, topic, context) =>
    set({
      elapsedSeconds: elapsed,
      topicTitle: topic,
      isDiagnostic: context?.isDiagnostic ?? false,
      planDay: context?.planDay ?? null,
      planSession: context?.planSession ?? null,
      targetSkill: context?.targetSkill ?? null,
      weekNumber: context?.weekNumber ?? null,
    }),
  clear:            () =>
    set({
      latestResult: null,
      latestSessionSummary: null,
      elapsedSeconds: 0,
      topicTitle: '',
      localVideoUri: null,
      isDiagnostic: false,
      planDay: null,
      planSession: null,
      targetSkill: null,
      weekNumber: null,
    }),
}));
