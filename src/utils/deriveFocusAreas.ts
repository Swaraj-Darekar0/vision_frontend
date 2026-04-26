import { OverallScores } from '../types/api';

const FOCUS_AREA_COPY: Record<keyof OverallScores, { title: string; description: string }> = {
  overall: {
    title: 'Overall Delivery',
    description: 'Your baseline is still forming, so consistency matters more than intensity.',
  },
  confidence: {
    title: 'Confidence',
    description: 'A steadier voice and stronger presence will make your ideas land better.',
  },
  clarity: {
    title: 'Clarity',
    description: 'Cleaner phrasing and sharper articulation will make you easier to follow.',
  },
  engagement: {
    title: 'Engagement',
    description: 'More variation and energy will help hold attention through the full answer.',
  },
  nervousness: {
    title: 'Composure',
    description: 'Reducing visible tension will make your delivery feel more grounded.',
  },
  content_effectiveness: {
    title: 'Content Effectiveness',
    description: 'Stronger structure and more purposeful examples will make your message more persuasive.',
  },
};

export function deriveFocusAreas(scores: OverallScores) {
  return (Object.entries(scores) as Array<[keyof OverallScores, number]>)
    .filter(([key, value]) => key !== 'overall' && typeof value === 'number' && Number.isFinite(value))
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([key]) => ({
      key,
      title: FOCUS_AREA_COPY[key].title,
      description: FOCUS_AREA_COPY[key].description,
      score: scores[key],
    }));
}
