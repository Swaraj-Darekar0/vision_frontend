import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fonts, fontSize, spacing, radius } from '../../theme';
import { StreakGrid } from '../ui/StreakGrid';
import { SessionListEntry } from '../../types/cache';

interface StreakSectionProps {
  sessions: SessionListEntry[];
  onPress: () => void;
}

export const StreakSection: React.FC<StreakSectionProps> = ({ sessions, onPress }) => (
  <TouchableOpacity 
    style={styles.container} 
    onPress={onPress} 
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel="View session history"
  >
    <View>
      <Text style={styles.label}>Activity Streak</Text>
      <Text style={styles.subtext}>Last 8 sessions</Text>
    </View>
    <StreakGrid sessions={sessions} />
    <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  label: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
  },
  subtext: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
});
