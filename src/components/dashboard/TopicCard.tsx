import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts, fontSize, spacing, radius } from '../../theme';
import { Card } from '../ui/Card';

interface TopicCardProps {
  title: string;
  durationHint: string;
  onStart: () => void;
}

export const TopicCard: React.FC<TopicCardProps> = ({ title, durationHint, onStart }) => (
  <Card style={styles.container}>
    <Text style={styles.overline}>TODAY'S TOPIC</Text>
    <Text 
      style={styles.title} 
      numberOfLines={1}
      adjustsFontSizeToFit={true}
      minimumFontScale={0.66}
    >
      {title}
    </Text>
    <View style={styles.hintRow}>
      <View style={styles.dot} />
      <Text style={styles.hint}>{durationHint}</Text>
    </View>
    <TouchableOpacity 
      style={styles.button} 
      onPress={onStart}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Start Presentation"
    >
      <Text style={styles.buttonText}>Start Presentation</Text>
    </TouchableOpacity>
  </Card>
);

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    marginVertical: spacing.md,
  },
  overline: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize['6xl'],
    fontFamily: fonts.bold,
    marginBottom: spacing.sm,
    width: '100%',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textSecondary,
    marginRight: spacing.sm,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
  },
});
