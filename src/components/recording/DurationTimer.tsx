import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, fontSize, spacing } from '../../theme';
import { formatElapsedSeconds } from '../../utils/formatTime';

interface DurationTimerProps {
  seconds: number;
  targetSeconds?: number;
}

export const DurationTimer: React.FC<DurationTimerProps> = ({ seconds, targetSeconds }) => (
  <View style={styles.container}>
    <Text style={styles.time}>{formatElapsedSeconds(seconds)}</Text>
    <Text style={styles.label}>
      {targetSeconds ? `AUTO ENDS AT ${formatElapsedSeconds(targetSeconds)}` : 'DURATION'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  time: {
    color: colors.textPrimary,
    fontSize: fontSize.timer,
    fontFamily: fonts.numeric,
    fontVariant: ['tabular-nums'],
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    letterSpacing: 2,
    marginTop: -spacing.sm,
  },
});
