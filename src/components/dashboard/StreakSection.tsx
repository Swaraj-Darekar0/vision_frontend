import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fonts, fontSize, spacing, radius } from '../../theme';
import { GlassSurface } from '../ui/GlassSurface';
import { StreakGrid } from '../ui/StreakGrid';

interface StreakSectionProps {
  totalAllocatedSessions?: number;
  completedSessions?: number;
  squareStates?: Array<'completed' | 'missed' | 'pending' | 'today'>;
  onPress: () => void;
}

export const StreakSection: React.FC<StreakSectionProps> = ({
  totalAllocatedSessions,
  completedSessions,
  squareStates,
  onPress,
}) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 390;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="View session history"
    >
      <GlassSurface style={[styles.container, isCompact && styles.containerCompact]}>
        <View style={styles.copyBlock}>
          <Text style={styles.label}>Activity Streak</Text>
          <Text style={styles.subtext}>For This Week</Text>
        </View>
        <StreakGrid
          totalSquares={totalAllocatedSessions}
          completedSquares={completedSessions}
          squareStates={squareStates}
        />
        <MaterialIcons name="chevron-right" size={24} color={colors.dashboardIconMuted} />
      </GlassSurface>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dashboardSurfaceBase,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    padding: spacing.base,
    gap: spacing.base,
  },
  containerCompact: {
    flexWrap: 'wrap',
  },
  copyBlock: {
    minWidth: 96,
    flexShrink: 1,
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
