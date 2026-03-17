import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, fontSize, spacing } from '../../theme';
import { formatElapsedSeconds } from '../../utils/formatTime';

interface DurationTimerProps {
  seconds: number;
}

export const DurationTimer: React.FC<DurationTimerProps> = ({ seconds }) => (
  <View style={styles.container}>
    <Text style={styles.time}>{formatElapsedSeconds(seconds)}</Text>
    <Text style={styles.label}>DURATION</Text>
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
    fontFamily: fonts.medium,
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
