import { OverallScores } from '../types/api';
import { SpeakerLevel } from '../types/plan';
import { SPEAKER_LEVEL } from '../theme/constants';

export function classifySpeakerLevel(scores: OverallScores): SpeakerLevel {
  if (
    scores.confidence < SPEAKER_LEVEL.FORCE_DEVELOPING_THRESHOLD &&
    scores.clarity < SPEAKER_LEVEL.FORCE_DEVELOPING_THRESHOLD
  ) {
    return 'developing';
  }

  if (scores.overall <= SPEAKER_LEVEL.DEVELOPING_MAX) {
    return 'developing';
  }

  if (scores.overall <= SPEAKER_LEVEL.COMPETENT_MAX) {
    return 'competent';
  }

  return 'advanced';
}
