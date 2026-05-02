import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, fontSize, radius, spacing } from '../theme';
import { DIAGNOSTIC_TOPIC } from '../theme/constants';
import { RootStackParamList } from '../types/navigation';
import { useAdaptiveLayout } from '../hooks/useAdaptiveLayout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DiagnosticEntry'>;

const DiagnosticEntryScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { bottomSpacing, cardPadding, heroTopSpacing, horizontalPadding, isNarrow, sectionGap, topSpacing } =
    useAdaptiveLayout();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingHorizontal: horizontalPadding,
          paddingTop: topSpacing,
          paddingBottom: bottomSpacing,
          rowGap: sectionGap,
        },
      ]}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={[styles.hero, { paddingTop: heroTopSpacing }]}>
        <Text style={styles.eyebrow}>FIRST STEP</Text>
        <Text style={[styles.title, isNarrow && styles.titleCompact]}>
          Let&apos;s assess your current level.
        </Text>
        <Text style={styles.copy}>
          Start with one short diagnostic session. We&apos;ll use it to understand how you
          speak today and shape the training that follows.
        </Text>
      </View>

      <View style={[styles.card, { padding: cardPadding }]}>
        <Text style={styles.cardLabel}>DIAGNOSTIC TOPIC</Text>
        <Text style={styles.cardTitle}>{DIAGNOSTIC_TOPIC.TITLE}</Text>
        <Text style={styles.cardHint}>About {DIAGNOSTIC_TOPIC.DURATION_MINUTES} minutes</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          navigation.replace('Recording', {
            topicTitle: DIAGNOSTIC_TOPIC.TITLE,
            minDurationSeconds: DIAGNOSTIC_TOPIC.MIN_DURATION_SECONDS,
            isDiagnostic: true,
          })
        }
      >
        <Text style={styles.buttonText}>Start Diagnostic</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  hero: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: '#8DB7FF',
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    letterSpacing: 1.4,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize['4xl'],
    fontFamily: fonts.extraBold,
    lineHeight: 46,
  },
  titleCompact: {
    fontSize: fontSize['3xl'],
    lineHeight: 38,
  },
  copy: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    lineHeight: 24,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    lineHeight: 30,
    marginBottom: spacing.sm,
  },
  cardHint: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
  },
});

export default DiagnosticEntryScreen;
