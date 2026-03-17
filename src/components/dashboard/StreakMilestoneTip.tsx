// src/components/dashboard/StreakMilestoneTip.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { fonts, fontSize } from '../../theme/typography';

interface Props {
  tip: string;
  skill: string;
  onDismiss: () => void;
}

export const StreakMilestoneTip: React.FC<Props> = ({ tip, skill, onDismiss }) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <View style={styles.flameBadge}>
        <Text style={styles.flameEmoji}>🔥</Text>
        <Text style={styles.badgeText}>{skill.charAt(0).toUpperCase() + skill.slice(1)} streak</Text>
      </View>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialIcons name="close" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
    <Text style={styles.tip}>{tip}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: spacing.base,
    borderWidth: 0.5,
    borderColor: 'rgba(57, 211, 83, 0.3)', // streakHigh with low opacity
    marginBottom: spacing.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  flameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(57, 211, 83, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  flameEmoji: { fontSize: 14 },
  badgeText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.streakHigh,
  },
  tip: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
