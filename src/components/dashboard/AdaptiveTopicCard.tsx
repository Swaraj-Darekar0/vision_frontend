import React from 'react';
import { Linking, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from '../../theme';
import { GlassSurface } from '../ui/GlassSurface';
import { PlanTopic } from '../../types/plan';

interface Props {
  topic: PlanTopic | null;
  locked: boolean;
  onStart: () => void;
  onUnlock: () => void;
  lockedTitle?: string;
  lockedMessage?: string;
  actionLabel?: string;
  disableAction?: boolean;
}

export const AdaptiveTopicCard: React.FC<Props> = ({
  topic,
  locked,
  onStart,
  onUnlock,
  lockedTitle,
  lockedMessage,
  actionLabel,
  disableAction = false,
}) => {
  const title = topic?.topic_title || 'Your personalized session will appear here once your weekly plan is ready.';
  const durationLabel =
    topic?.duration_minutes != null
      ? `${topic.duration_minutes} min${topic.duration_minutes === 1 ? '' : 's'}`
      : null;

  const handleYoutube = async () => {
    if (!topic?.resources.youtube_search) return;
    await Linking.openURL(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(topic.resources.youtube_search)}`,
    );
  };

  return (
    <GlassSurface style={styles.container}>
      <Text style={styles.overline}>TODAY&apos;S SESSION</Text>
      <Text style={styles.title}>{locked ? lockedTitle || 'Unlock your plan to begin' : title}</Text>
      {topic && !locked && durationLabel ? (
        <View style={styles.metaRow}>
          <View style={styles.durationPill}>
            <Text style={styles.durationText}>{durationLabel} session</Text>
          </View>
        </View>
      ) : null}
      {locked && lockedMessage ? <Text style={styles.lockedMessage}>{lockedMessage}</Text> : null}
      {topic && !locked && (
        <View style={styles.prepareBlock}>
          <Text style={styles.prepareLabel}>PREPARE</Text>
          <Text style={styles.resourceText}>Idea: {topic.resources.hint}</Text>
          {topic.resources.research_prompt ? (
            <Text style={styles.resourceText}>Look up: {topic.resources.research_prompt}</Text>
          ) : null}
          {topic.resources.youtube_search ? (
            <Pressable onPress={() => void handleYoutube()}>
              <Text style={[styles.resourceText, styles.linkText]}>
                Search YouTube: {topic.resources.youtube_search}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
      <TouchableOpacity
        style={[styles.button, locked && styles.buttonMuted, disableAction && styles.buttonDisabled]}
        onPress={locked ? onUnlock : onStart}
        disabled={disableAction}
      >
        <Text style={styles.buttonText}>
          {actionLabel || (locked ? 'Get Going' : 'Start Session')}
        </Text>
      </TouchableOpacity>
    </GlassSurface>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    marginVertical: spacing.md,
  },
  overline: {
    color: colors.dashboardTextMuted,
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.dashboardTextPrimary,
    fontSize: fontSize['2xl'],
    fontFamily: fonts.bold,
    lineHeight: 34,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  durationPill: {
    backgroundColor: 'rgba(6, 6, 6, 0.05)',
    borderWidth: 1,
    borderColor: colors.dashboardBorderFaint,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  durationText: {
    color: colors.dashboardTextSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.semiBold,
  },
  lockedMessage: {
    color: colors.dashboardTextSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  prepareBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.dashboardBorderFaint,
    paddingTop: spacing.base,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  prepareLabel: {
    color: colors.dashboardTextMuted,
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    letterSpacing: 1.2,
  },
  resourceText: {
    color: colors.dashboardTextSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    lineHeight: 20,
  },
  linkText: {
    color: '#8DB7FF',
  },
  button: {
    backgroundColor: colors.dashboardTextPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonMuted: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.dashboardBorderFaint,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.dashboardHeroMonoStart,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
  },
});
