import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import { SessionListEntry } from '../../types/cache';
import { scoreToStreakColor } from '../../utils/scoreToColor';

interface StreakGridProps {
  sessions: SessionListEntry[];
  totalSquares?: number;
}

export const StreakGrid: React.FC<StreakGridProps> = ({ sessions, totalSquares = 8 }) => {
  const safeSquareCount = Math.max(0, totalSquares);
  const visibleSessions = sessions.slice(0, safeSquareCount).reverse();
  const squares = Array.from({ length: safeSquareCount });

  return (
    <View style={styles.container}>
      {squares.map((_, i) => {
        const session = visibleSessions[i];
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
    borderWidth: 1,
    borderColor: colors.dashboardBorderFaint,
  },
});
