import { EvaluationResult } from '../types/api';

export interface TimelineClip {
  index:       number;
  timeStart:   number;    // seconds — for video seek
  timeEnd:     number;    // seconds — for video seek stop
  timeLabel:   string;    // "00:05" — for display
  eventType:   string;    // "rapid_speech_segment"
  coachNote:   string;    // from llm_feedback.timestamped_moments
  hasNote:     boolean;   // false if no moment matched this event
}

const MATCH_TOLERANCE_S = 8; // seconds — moment at "00:05" matches event time_start 5±8s

function mmssToSeconds(mmss: string): number {
  if (!mmss) return 0;
  const [mm, ss] = mmss.split(':').map(Number);
  return (mm || 0) * 60 + (ss || 0);
}

export function mergeTimelineEvents(result: EvaluationResult): TimelineClip[] {
  const { timestamp_events, llm_feedback } = result;
  const moments = llm_feedback.timestamped_moments ?? [];

  return (timestamp_events || []).map((event, i) => {
    // Find the closest timestamped_moment to this event's time_start
    const matchedMoment = moments.find((m) => {
      const momentSecs = mmssToSeconds(m.time);
      return Math.abs(momentSecs - event.time_start) <= MATCH_TOLERANCE_S;
    });

    return {
      index:     i,
      timeStart: event.time_start,
      timeEnd:   event.time_end,
      timeLabel: formatSecondsToMMSS(event.time_start),
      eventType: event.event,
      coachNote: matchedMoment?.note ?? getFallbackNote(event.event),
      hasNote:   !!matchedMoment,
    };
  });
}

function formatSecondsToMMSS(s: number): string {
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

// Fallback note if no LLM moment matched — derived from event type
function getFallbackNote(eventType: string): string {
  const map: Record<string, string> = {
    rapid_speech_segment:  'Speaking too fast — slow down and breathe.',
    monotone_segment:      'Flat delivery — add pitch variation here.',
    vocal_instability_spike: 'Vocal instability — steady your breath.',
    excessive_pause:       'Long pause — regroup and re-engage.',
  };
  return map[eventType] ?? 'Review this moment.';
}
