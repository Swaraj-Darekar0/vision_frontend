// src/components/ui/SessionActivityCard.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EvaluationResult } from '../../types/api';
import { SHARE_CARD } from '../../theme/constants';
import { fonts } from '../../theme';
import { toPercent } from '../../utils/toPercent';

interface Props {
  result: EvaluationResult;
  topicTitle: string;
  durationLabel: string;
  sessionDate: string;  // formatted: "March 16, 2026"
}

export const SessionActivityCard = React.forwardRef<View, Props>(
  ({ result, topicTitle, durationLabel, sessionDate }, ref) => {
    const { overall, confidence, clarity, engagement, nervousness } =
      result.overall_scores;
    const closing = result.llm_feedback.motivational_closing;

    const metrics = [
      { label: 'Confidence',  value: confidence },
      { label: 'Clarity',     value: clarity },
      { label: 'Engagement',  value: engagement },
      { label: 'Nervousness', value: nervousness },
    ];

    return (
      <View ref={ref} style={styles.card} collapsable={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>🎙 SpeakingCoach</Text>
          <Text style={styles.headerRight}>Vision</Text>
        </View>

        <View style={styles.divider} />

        {/* Overall score */}
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreLabel}>OVERALL SCORE</Text>
          <Text style={styles.scoreValue}>{toPercent(overall)}</Text>
        </View>

        <View style={styles.divider} />

        {/* Metric pills */}
        <View style={styles.metricsRow}>
          {metrics.map((m) => (
            <View key={m.label} style={styles.metricPill}>
              <Text style={styles.metricValue}>{toPercent(m.value)}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* LLM quote */}
        <Text style={styles.quote} numberOfLines={3}>
          "{closing}"
        </Text>

        <View style={styles.divider} />

        {/* Session meta */}
        <View style={styles.footer}>
          <Text style={styles.footerTopic}>{topicTitle}</Text>
          <Text style={styles.footerMeta}>{durationLabel}  ·  {sessionDate}</Text>
        </View>
      </View>
    );
  },
);

SessionActivityCard.displayName = 'SessionActivityCard';

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD.WIDTH,
    height: SHARE_CARD.HEIGHT,
    backgroundColor: SHARE_CARD.BACKGROUND,
    padding: 80,
    justifyContent: 'space-evenly',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appName: {
    fontFamily: fonts.bold,
    fontSize: 42,
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  headerRight: {
    fontFamily: fonts.regular,
    fontSize: 32,
    color: '#555555',
  },
  divider: {
    height: 1,
    backgroundColor: '#111111',
  },
  scoreBlock: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  scoreLabel: {
    fontFamily: fonts.regular,
    fontSize: 28,
    color: '#666666',
    letterSpacing: 4,
    marginBottom: 16,
  },
  scoreValue: {
    fontFamily: fonts.numeric,
    fontSize: 200,
    color: '#FFFFFF',
    lineHeight: 200,
    letterSpacing: -8,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  metricPill: {
    alignItems: 'center',
    backgroundColor: '#050505',
    borderRadius: 20,
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#111111',
    minWidth: 200,
  },
  metricValue: {
    fontFamily: fonts.numeric,
    fontSize: 52,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  metricLabel: {
    fontFamily: fonts.regular,
    fontSize: 28,
    color: '#888888',
  },
  quote: {
    fontFamily: fonts.regular,
    fontSize: 38,
    color: '#AAAAAA',
    lineHeight: 56,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  footer: {
    gap: 12,
  },
  footerTopic: {
    fontFamily: fonts.bold,
    fontSize: 40,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  footerMeta: {
    fontFamily: fonts.regular,
    fontSize: 30,
    color: '#555555',
  },
});
