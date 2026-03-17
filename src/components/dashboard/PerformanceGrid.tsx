import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MetricTile } from '../ui/MetricTile';
import { toPercent } from '../../utils/toPercent';
import { scoreToLabel } from '../../utils/scoreToLabel';
import { colors, spacing } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';

interface PerformanceGridProps {
  overallScore?: number;
  confidenceScore?: number;
}

export const PerformanceGrid: React.FC<PerformanceGridProps> = ({ 
  overallScore, confidenceScore 
}) => {
  const confidenceLabel = confidenceScore !== undefined ? scoreToLabel(confidenceScore) : '--';
  
  let trendIcon: keyof typeof MaterialIcons.glyphMap = 'trending-flat';
  let trendColor = colors.textMuted;
  
  if (confidenceScore !== undefined) {
    if (confidenceScore >= 0.70) {
      trendIcon = 'trending-up';
      trendColor = colors.streakHigh;
    } else if (confidenceScore < 0.40) {
      trendIcon = 'trending-down';
      trendColor = colors.negative;
    }
  }

  return (
    <View style={styles.container}>
      <MetricTile
        icon="monitor"
        label="Overall Performance"
        value={overallScore !== undefined ? toPercent(overallScore) : '--'}
      />
      <MetricTile
        icon="psychology"
        label="Confidence Score"
        value={confidenceLabel}
        trendIcon={trendIcon}
        trendColor={trendColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
});
