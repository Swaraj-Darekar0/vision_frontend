import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fonts, fontSize, spacing, radius } from '../../theme';
import { GlassSurface } from '../ui/GlassSurface';
import { StreakGrid } from '../ui/StreakGrid';
import { SessionListEntry } from '../../types/cache';

interface StreakSectionProps {
  sessions: SessionListEntry[];
  totalAllocatedSessions?: number;
  onPress: () => void;
}

export const StreakSection: React.FC<StreakSectionProps> = ({
  sessions,
  totalAllocatedSessions,
  onPress,
}) => (
  <TouchableOpacity 
    onPress={onPress} 
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel="View session history"
  >
    <GlassSurface style={styles.container}>
      <View>
        <Text style={styles.label}>Activity Streak</Text>
        <Text style={styles.subtext}>For This Week</Text>
      </View>
      <StreakGrid sessions={sessions} totalSquares={totalAllocatedSessions} />
      <MaterialIcons name="chevron-right" size={24} color={colors.dashboardIconMuted} />
    </GlassSurface>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dashboardSurfaceBase,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    padding: spacing.base,
  },
  label: {
    color: colors.dashboardTextPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
  },
  subtext: {
    color: colors.dashboardTextSecondary,
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
});
