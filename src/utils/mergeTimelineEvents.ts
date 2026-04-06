import { EvaluationResult } from '../types/api';

export interface TimelineClip {
  index: number;
  timeStart: number;
  timeEnd: number;
  timeLabel: string;
  eventType: string;
  coachNote: string;
  hasNote: boolean;
}

function mmssToSeconds(mmss: string): number {
  if (!mmss) return 0;
  const [mm, ss] = mmss.split(':').map(Number);
  return (mm || 0) * 60 + (ss || 0);
}

function formatSecondsToMMSS(seconds: number): string {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export function mergeTimelineEvents(result: EvaluationResult): TimelineClip[] {
  const moments = result.llm_feedback.timestamped_moments ?? [];

  return moments.map((moment, index) => {
    const timeStart = mmssToSeconds(moment.start);
    const parsedEnd = mmssToSeconds(moment.end);
    const timeEnd = parsedEnd > timeStart ? parsedEnd : timeStart + 5;

    return {
      index,
      timeStart,
      timeEnd,
      timeLabel: moment.start || formatSecondsToMMSS(timeStart),
      eventType: moment.event || 'review_moment',
      coachNote: moment.note ?? 'Review this moment.',
      hasNote: true,
    };
  });
}
