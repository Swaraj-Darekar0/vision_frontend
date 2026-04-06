import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, fontSize, radius, spacing } from '../../theme';
import { DashboardGrainOverlay } from '../ui/DashboardGrainOverlay';
import { SessionListEntry } from '../../types/cache';
import { formatSessionDate } from '../../utils/formatDate';
import { scoreToLabel } from '../../utils/scoreToLabel';
import { toPercent } from '../../utils/toPercent';

const COLLAPSED_HEIGHT = 184;
const EXPANDED_HEIGHT = 318;

const CARD_PALETTES = [
  {
    surface: 'rgb(255, 255, 255)',
    accent: 'rgba(24, 24, 24, 0.74)',
    chip: 'rgba(122, 119, 119, 0.3)',
    border: 'rgba(255, 255, 255, 0.34)',
    text: '#121212',
    muted: 'rgba(18, 18, 18, 0.62)',
    shadow: 'rgba(0, 0, 0, 0.14)',
    action: 'rgba(255, 255, 255, 0.42)',
    veil: 'rgba(255, 255, 255, 0.22)',
  },
  {
    surface: 'rgb(199, 185, 185)',
    accent: 'rgb(34, 34, 34)',
    chip: 'rgba(255, 255, 255, 0.34)',
    border: 'rgba(255, 255, 255, 0.38)',
    text: '#151515',
    muted: 'rgba(21, 21, 21, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.12)',
    action: 'rgba(255, 255, 255, 0.46)',
    veil: 'rgba(255, 255, 255, 0.24)',
  },
  {
    surface: 'rgb(255, 219, 219)',
    accent: 'rgba(26, 26, 26, 0.72)',
    chip: 'rgba(255, 255, 255, 0.32)',
    border: 'rgba(255, 255, 255, 0.33)',
    text: '#141414',
    muted: 'rgba(20, 20, 20, 0.58)',
    shadow: 'rgba(0, 0, 0, 0.13)',
    action: 'rgba(255, 255, 255, 0.44)',
    veil: 'rgba(255, 255, 255, 0.2)',
  },
  {
    surface: 'rgb(185, 185, 185)',
    accent: 'rgba(18, 18, 18, 0.78)',
    chip: 'rgba(255, 255, 255, 0.36)',
    border: 'rgba(255, 255, 255, 0.4)',
    text: '#101010',
    muted: 'rgba(16, 16, 16, 0.56)',
    shadow: 'rgba(0, 0, 0, 0.11)',
    action: 'rgba(255, 255, 255, 0.5)',
    veil: 'rgba(255, 255, 255, 0.26)',
  },
  {
    surface: 'rgb(215, 208, 208)',
    accent: 'rgba(30, 30, 30, 0.7)',
    chip: 'rgba(255, 255, 255, 0.28)',
    border: 'rgba(255, 255, 255, 0.32)',
    text: '#161616',
    muted: 'rgba(22, 22, 22, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.15)',
    action: 'rgba(255, 255, 255, 0.4)',
    veil: 'rgba(255, 255, 255, 0.18)',
  },
] as const;

interface SessionListItemProps {
  entry: SessionListEntry;
  index: number;
  expanded: boolean;
  hasEntranceAnimation: boolean;
  totalCount: number;
  onPress: () => void;
  onDelete: () => void;
}

export const SessionListItem: React.FC<SessionListItemProps> = ({
  entry,
  index,
  expanded,
  hasEntranceAnimation,
  totalCount,
  onPress,
  onDelete,
}) => {
  const heightAnim = useRef(new Animated.Value(expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT)).current;
  const revealAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const entranceAnim = useRef(new Animated.Value(hasEntranceAnimation ? 0 : 1)).current;

  const palette = useMemo(() => {
    const seedSource = `${entry.sessionId}:${index}`;
    let hash = 0;
    for (let i = 0; i < seedSource.length; i += 1) {
      hash = (hash * 31 + seedSource.charCodeAt(i)) >>> 0;
    }
    return CARD_PALETTES[hash % CARD_PALETTES.length];
  }, [entry.sessionId, index]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
        duration: 460,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: false,
      }),
      Animated.timing(revealAnim, {
        toValue: expanded ? 1 : 0,
        duration: 420,
        easing: Easing.bezier(0.2, 0.9, 0.2, 1),
        useNativeDriver: false,
      }),
    ]).start();
  }, [expanded, heightAnim, revealAnim]);

  useEffect(() => {
    if (!hasEntranceAnimation) {
      entranceAnim.setValue(1);
      return;
    }

    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 760,
      delay: (totalCount - index - 1) * 115,
      easing: Easing.bezier(0.2, 0.9, 0.24, 1),
      useNativeDriver: false,
    }).start();
  }, [entranceAnim, hasEntranceAnimation, index, totalCount]);

  const translateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [84, 0],
  });

  const bodyOpacity = revealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

  const bodyTranslate = revealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  const performanceLabel = scoreToLabel(entry.overallScore);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          height: heightAnim,
          zIndex: expanded ? totalCount + 1 : totalCount - index,
          transform: [{ translateY }],
          opacity: entranceAnim,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={[
          styles.card,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            shadowColor: palette.shadow,
          },
        ]}
        android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
      >
        <DashboardGrainOverlay opacity={0.08} />
        <View style={styles.topHighlight} />
        <View style={styles.leftSheen} />
        <View style={styles.rightSheen} />
        <View style={styles.bottomShade} />
        <View style={styles.headerRow}>
          <View style={styles.headerMeta}>
            <View style={styles.topBadgeRow}>
              <View style={styles.sessionNumberBadge}>
                <Text style={styles.sessionNumberText}>{index + 1}</Text>
              </View>
              {entry.isFirstSession ? (
                <View style={[styles.diagnosticBadge, { borderColor: palette.border, backgroundColor: palette.veil }]}>
                  <Text style={[styles.diagnosticText, { color: palette.muted }]}>Your diagnostic session</Text>
                </View>
              ) : null}
            </View>
            <View style={[styles.performancePill, { backgroundColor: palette.chip }]}>
              <View style={[styles.performanceDot, { backgroundColor: palette.accent }]} />
              <Text style={[styles.performanceText, { color: palette.text }]}>
                {performanceLabel} performance
              </Text>
            </View>
          </View>

          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            hitSlop={8}
            style={[styles.iconButton, { backgroundColor: palette.action }]}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${entry.topicTitle}`}
          >
            <MaterialIcons name="delete-outline" size={20} color={palette.muted} />
          </Pressable>
        </View>

        <Text style={[styles.title, { color: palette.text }]} numberOfLines={expanded ? 3 : 2}>
          {entry.topicTitle}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialIcons name="event" size={15} color={palette.muted} />
            <Text style={[styles.metaText, { color: palette.muted }]}>{formatSessionDate(entry.processedAt)}</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="schedule" size={15} color={palette.muted} />
            <Text style={[styles.metaText, { color: palette.muted }]}>{entry.durationLabel}</Text>
          </View>
        </View>

        <Animated.View
          style={[
            styles.body,
            {
              opacity: bodyOpacity,
              transform: [{ translateY: bodyTranslate }],
            },
          ]}
        >
          <View style={styles.scoreRow}>
            <View style={[styles.scoreChip, { backgroundColor: palette.chip }]}>
              <Text style={[styles.scoreLabel, { color: palette.muted }]}>Overall</Text>
              <Text style={[styles.scoreValue, { color: palette.text }]}>{toPercent(entry.overallScore)}</Text>
            </View>
            <View style={[styles.scoreChip, { backgroundColor: palette.chip }]}>
              <Text style={[styles.scoreLabel, { color: palette.muted }]}>Confidence</Text>
              <Text style={[styles.scoreValue, { color: palette.text }]}>{toPercent(entry.confidenceScore)}</Text>
            </View>
          </View>

          <View style={[styles.summaryPanel, { borderColor: palette.border, backgroundColor: palette.veil }]}>
            <Text style={[styles.summaryEyebrow, { color: palette.muted }]}>Tap behavior</Text>
            <Text style={[styles.summaryText, { color: palette.text }]}>
              {expanded ? 'Tap again to open the full session breakdown.' : 'Tap to fully reveal this session card.'}
            </Text>
          </View>

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: palette.muted }]}>Detailed insights available</Text>
            <MaterialIcons name="arrow-forward" size={18} color={palette.text} />
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.base,
  },
  card: {
    flex: 1,
    borderRadius: radius['2xl'],
    padding: spacing.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 10,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: spacing.lg,
    right: spacing.lg,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.46)',
  },
  leftSheen: {
    position: 'absolute',
    left: 0,
    top: spacing.lg,
    bottom: spacing.lg,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  rightSheen: {
    position: 'absolute',
    right: 0,
    top: spacing.lg,
    bottom: spacing.lg,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  bottomShade: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    bottom: 0,
    height: 18,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    backgroundColor: 'rgba(0, 0, 0, 0)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerMeta: {
    flex: 1,
    paddingRight: spacing.md,
  },
  topBadgeRow: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionNumberBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionNumberText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
  },
  diagnosticBadge: {
    marginLeft: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  diagnosticText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
  },
  performancePill: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  performanceDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    marginRight: spacing.sm,
  },
  performanceText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.semiBold,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginTop: spacing.lg,
    fontSize: fontSize['2xl'],
    lineHeight: 30,
    fontFamily: fonts.bold,
    paddingRight: spacing['2xl'],
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.base,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.base,
    marginBottom: spacing.sm,
  },
  metaText: {
    marginLeft: 6,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
  },
  body: {
    marginTop: spacing.base,
    flex: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    columnGap: spacing.sm,
  },
  scoreChip: {
    flex: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  scoreLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreValue: {
    marginTop: spacing.xs,
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
  },
  summaryPanel: {
    marginTop: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  summaryEyebrow: {
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryText: {
    marginTop: spacing.xs,
    fontSize: fontSize.md,
    lineHeight: 22,
    fontFamily: fonts.semiBold,
  },
  footerRow: {
    marginTop: 'auto',
    paddingTop: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
  },
});
