import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from '../../theme';
import { SPEAKER_LEVEL } from '../../theme/constants';
import { SpeakerLevel } from '../../types/plan';

interface Props {
  level: SpeakerLevel;
}

export const SpeakerLevelBadge: React.FC<Props> = ({ level }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>YOUR SPEAKER LEVEL</Text>
      <View style={styles.badge}>
        <Text style={styles.level}>{SPEAKER_LEVEL.LABELS[level].toUpperCase()}</Text>
        <Text style={styles.tagline}>{SPEAKER_LEVEL.TAGLINES[level]}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  badge: {
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primaryTint,
    alignItems: 'center',
  },
  level: {
    color: colors.textPrimary,
    fontSize: fontSize['3xl'],
    fontFamily: fonts.extraBold,
    marginBottom: spacing.sm,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
});
