import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import { SessionListEntry } from '../../types/cache';
import { scoreToStreakColor } from '../../utils/scoreToColor';

interface StreakGridProps {
  sessions: SessionListEntry[];
}

export const StreakGrid: React.FC<StreakGridProps> = ({ sessions }) => {
  const MAX_SQUARES = 8;
  const reversedSessions = [...sessions].reverse().slice(0, MAX_SQUARES);
  const squares = Array.from({ length: MAX_SQUARES });

  return (
    <View style={styles.container}>
      {squares.map((_, i) => {
        const session = reversedSessions[i];
        const color = session ? scoreToStreakColor(session.overallScore) : colors.streakEmpty;
        return (
          <View 
            key={i} 
            style={[styles.square, { backgroundColor: color }]} 
            accessibilityLabel={session ? `Session performance: ${Math.round(session.overallScore * 100)}%` : 'No session'}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    width: (16 * 4) + (8 * 3), // 4 columns + gaps
  },
  square: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
});
