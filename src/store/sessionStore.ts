// src/store/sessionStore.ts
import { create } from 'zustand';
import { EvaluationResult } from '../types/api';

interface SessionStore {
  latestResult:     EvaluationResult | null;
  elapsedSeconds:   number;
  topicTitle:       string;
  localVideoUri:    string | null;
  setLatestResult:  (r: EvaluationResult, localUri?: string | null) => void;
  setRecordingMeta: (elapsed: number, topic: string) => void;
  clear:            () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  latestResult:     null,
  elapsedSeconds:   0,
  topicTitle:       '',
  localVideoUri:    null,
  setLatestResult:  (r, localUri) => set({ latestResult: r, localVideoUri: localUri ?? null }),
  setRecordingMeta: (elapsed, topic) => set({ elapsedSeconds: elapsed, topicTitle: topic }),
  clear:            () => set({ latestResult: null, elapsedSeconds: 0, topicTitle: '', localVideoUri: null }),
}));
