import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { colors, fonts, fontSize, spacing, radius } from '../../theme';
import { EvaluationResult, OverallScores } from '../../types/api';
import { toPercent } from '../../utils/toPercent';
import { deltaToColor } from '../../utils/deltaToColor';
import { scoreToLabel } from '../../utils/scoreToLabel';
import { Card } from './Card';
import { MetricTile } from './MetricTile';
import { mergeTimelineEvents } from '../../utils/mergeTimelineEvents';
import { TimelineViewer } from './TimelineViewer';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ResultsViewProps {
  result: EvaluationResult;
  topicTitle?: string;
  sessionDurationLabel?: string;
  localVideoUri?: string | null;
}

// ─── Animated Score ────────────────────────────────────────────────────────────
const AnimatedScore = ({ score }: { score: number }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(score, {
      duration: 1000,
      easing: Easing.out(Easing.quad),
    });
  }, [score]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(1, { duration: 500 }),
  }));

  return (
    <Animated.Text style={[styles.overallValue, animatedStyle]}>
      {toPercent(score)}
    </Animated.Text>
  );
};

// ─── Delta Row ─────────────────────────────────────────────────────────────────
interface DeltaRowProps {
  label: string;
  change: number;
  deltaLabel: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}

const DeltaRow: React.FC<DeltaRowProps> = ({ label, change, deltaLabel, icon }) => {
  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 0.001;

  const trendIcon: React.ComponentProps<typeof MaterialIcons>['name'] = isNeutral
    ? 'trending-flat'
    : isPositive
    ? 'trending-up'
    : 'trending-down';

  const trendColor = isNeutral
    ? colors.textMuted
    : isPositive
    ? colors.positive
    : colors.negative;

  const changeDisplay = isNeutral
    ? 'Stable'
    : `${isPositive ? '+' : ''}${(change * 100).toFixed(1)}%`;

  return (
    <View style={deltaStyles.row}>
      <View style={deltaStyles.iconWrapper}>
        <MaterialIcons name={icon} size={16} color={colors.textSecondary} />
      </View>
      <View style={deltaStyles.labelCol}>
        <Text style={deltaStyles.label}>{label}</Text>
        <Text style={[deltaStyles.badge, { color: trendColor }]}>{deltaLabel}</Text>
      </View>
      <View style={deltaStyles.rightCol}>
        <MaterialIcons name={trendIcon} size={18} color={trendColor} />
        <Text style={[deltaStyles.change, { color: trendColor }]}>{changeDisplay}</Text>
      </View>
    </View>
  );
};

const deltaStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderMuted,
  },
  iconWrapper: {
    width: 32,
    alignItems: 'center',
  },
  labelCol: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  label: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
  },
  badge: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  change: {
    fontSize: fontSize.sm,
    fontFamily: fonts.semiBold,
    minWidth: 52,
    textAlign: 'right',
  },
});

// ─── Main Component ────────────────────────────────────────────────────────────
export const ResultsView: React.FC<ResultsViewProps> = React.memo(({ result, sessionDurationLabel, localVideoUri }) => {
  const { overall_scores, llm_feedback, progress_comparison, raw_metrics_snapshot } = result;

  const [progressOpen, setProgressOpen] = useState(false);

  const toggleProgress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setProgressOpen(prev => !prev);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'My Speaking Session Results',
        message:
          `Overall Performance: ${toPercent(overall_scores.overall)}\n` +
          `Confidence: ${toPercent(overall_scores.confidence)}\n` +
          `Clarity: ${toPercent(overall_scores.clarity)}\n\n` +
          `"${llm_feedback.motivational_closing}"`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const deriveStrengths = (scores: OverallScores): string[] => {
    const s: string[] = [];
    if (scores.confidence >= 0.65) s.push(`Strong confidence (${toPercent(scores.confidence)})`);
    if (scores.clarity >= 0.65) s.push(`Clear speech delivery (${toPercent(scores.clarity)})`);
    if (scores.engagement >= 0.65) s.push(`High engagement (${toPercent(scores.engagement)})`);
    if (scores.nervousness <= 0.35) s.push(`Low nervousness — very composed`);
    if (s.length === 0) s.push('Session complete — keep practising to build your baseline.');
    return s;
  };

  const strengths = deriveStrengths(overall_scores);

  // Timeline events merge
  const timelineClips = mergeTimelineEvents(result);

  // Filler words: build from raw data
  const fillerWordsUsed = result.filler_words_used ?? {};
  const totalFillerCount = Object.values(fillerWordsUsed).reduce((sum, n) => sum + n, 0);
  
  const fillerEntries = Object.entries(fillerWordsUsed)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Delta map for the progression section
  const { deltas } = progress_comparison;
  const coreDeltaRows = [
    { key: 'overall',    label: 'Overall',    icon: 'analytics' as const,        d: deltas.overall },
    { key: 'confidence', label: 'Confidence', icon: 'psychology' as const,       d: deltas.confidence },
    { key: 'clarity',    label: 'Clarity',    icon: 'record-voice-over' as const, d: deltas.clarity },
    { key: 'engagement', label: 'Engagement', icon: 'star-outline' as const,     d: deltas.engagement },
    { key: 'nervousness',label: 'Nervousness',icon: 'sentiment-satisfied' as const, d: deltas.nervousness },
  ];

  const behavioralDeltaRows = [
    { key: 'posture',  label: 'Posture Stability', icon: 'accessibility-new' as const, d: deltas.behavioral.posture_stability },
    { key: 'filler',   label: 'Filler Reduction',  icon: 'voice-over-off' as const,    d: deltas.behavioral.filler_reduction },
    { key: 'pause',    label: 'Pause Optimisation', icon: 'pause-circle-outline' as const, d: deltas.behavioral.pause_optimization },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Overall Score Card ─────────────────────────────────────────────── */}
      <Card style={styles.overallCard}>
        <View style={styles.overallHeader}>
          <View>
            <Text style={styles.overallLabel}>OVERALL SCORE</Text>
            <AnimatedScore score={overall_scores.overall} />
          </View>
          <View style={[styles.deltaBadge, { backgroundColor: deltaToColor(progress_comparison.deltas.overall.label) + '20' }]}>
            <Text style={[styles.deltaText, { color: deltaToColor(progress_comparison.deltas.overall.label) }]}>
              {progress_comparison.deltas.overall.label}
            </Text>
          </View>
        </View>
        {sessionDurationLabel && (
          <View style={styles.durationRow}>
            <MaterialIcons name="schedule" size={16} color={colors.textSecondary} />
            <Text style={styles.durationText}>{sessionDurationLabel}</Text>
          </View>
        )}
      </Card>

      {/* ── Metric Grid ────────────────────────────────────────────────────── */}
      <View style={styles.metricGrid}>
        <View style={styles.metricRow}>
          <MetricTile
            icon="psychology"
            label="Confidence"
            value={toPercent(overall_scores.confidence)}
            trendIcon={overall_scores.confidence >= 0.7 ? 'trending-up' : 'trending-flat'}
            trendColor={overall_scores.confidence >= 0.7 ? colors.positive : colors.textMuted}
          />
          <MetricTile
            icon="record-voice-over"
            label="Clarity"
            value={toPercent(overall_scores.clarity)}
            trendIcon={overall_scores.clarity >= 0.7 ? 'trending-up' : 'trending-flat'}
            trendColor={overall_scores.clarity >= 0.7 ? colors.positive : colors.textMuted}
          />
        </View>
        <View style={styles.metricRow}>
          <MetricTile
            icon="star-outline"
            label="Engagement"
            value={toPercent(overall_scores.engagement)}
          />
          <MetricTile
            icon="speed"
            label="Speech Rate"
            value={`${Math.round(raw_metrics_snapshot.audio.speech_rate_wpm)} WPM`}
          />
        </View>
      </View>

      {/* ── Key Strengths ─────────────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Key Strengths</Text>
      <Card style={styles.listCard}>
        {strengths.map((strength, i) => (
          <View key={i} style={[styles.listItem, i === strengths.length - 1 && styles.listItemLast]}>
            <MaterialIcons name="check-circle" size={18} color={colors.positive} />
            <Text style={styles.listText}>{strength}</Text>
          </View>
        ))}
      </Card>

      {/* ── Areas for Improvement ─────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Areas for Improvement</Text>
      <Card style={styles.listCard}>
        {llm_feedback.top_3_action_items.map((item, i) => (
          <View key={i} style={[styles.listItem, i === llm_feedback.top_3_action_items.length - 1 && styles.listItemLast]}>
            <MaterialIcons name="arrow-right-alt" size={18} color={colors.primary} />
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </Card>

      {/* ── Timeline Viewer ────────────────────────────────────────────────── */}
      {timelineClips.length > 0 && (
        <TimelineViewer 
          clips={timelineClips} 
          localVideoUri={localVideoUri ?? null} 
        />
      )}

      {/* ── Filler Words (fixed) ───────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Filler Words</Text>
      <Card style={styles.fillerCard}>
        {/* Header row */}
        <View style={styles.fillerTopRow}>
          <View style={styles.fillerRatioBlock}>
            <Text style={styles.fillerRatioValue}>{toPercent(raw_metrics_snapshot.audio.filler_ratio)}</Text>
            <Text style={styles.fillerRatioLabel}>Filler Ratio</Text>
          </View>
          <View style={styles.fillerCountBlock}>
            <Text style={styles.fillerCountValue}>{totalFillerCount}</Text>
            <Text style={styles.fillerRatioLabel}>Total Fillers</Text>
          </View>
        </View>

        {/* Per-word breakdown */}
        <View style={styles.fillerDivider} />
        {fillerEntries.length > 0 ? (
          <View style={styles.fillerWordGrid}>
            {fillerEntries.map(([word, count]) => (
              <View key={word} style={[styles.fillerWordCell, styles.fillerWordCellActive]}>
                <Text style={[styles.fillerWordCount, styles.fillerWordCountActive]}>
                  {count}
                </Text>
                <Text style={styles.fillerWordLabel}>"{word}"</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.fillerNoDataRow}>
            <MaterialIcons name="check-circle-outline" size={16} color={colors.positive} />
            <Text style={styles.fillerNoDataText}>No filler words detected — great job!</Text>
          </View>
        )}
      </Card>

      {/* ── Timestamped Moments ────────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Timestamped Moments</Text>
      <Card style={styles.listCard}>
        {llm_feedback.timestamped_moments.map((moment, i) => (
          <View
            key={i}
            style={[
              styles.momentItem,
              i === llm_feedback.timestamped_moments.length - 1 && styles.listItemLast,
            ]}
          >
            <View style={styles.momentTimeBadge}>
              <MaterialIcons name="schedule" size={12} color={colors.primary} />
              <Text style={styles.momentTime}>{moment.time}</Text>
            </View>
            <Text style={styles.momentNote}>{moment.note}</Text>
          </View>
        ))}
      </Card>

      {/* ── View Your Progression (collapsible) ───────────────────────────── */}
      <TouchableOpacity
        style={styles.progressionHeader}
        onPress={toggleProgress}
        activeOpacity={0.75}
      >
        <View style={styles.progressionHeaderLeft}>
          <MaterialIcons name="insights" size={20} color={colors.primary} />
          <Text style={styles.progressionHeaderText}>View Your Progression</Text>
        </View>
        <MaterialIcons
          name={progressOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={22}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {progressOpen && (
        <Card style={styles.progressionCard}>
          {/* Headline */}
          <View style={styles.progressionHeadline}>
            <MaterialIcons name="emoji-events" size={16} color={colors.primary} />
            <Text style={styles.progressionHeadlineText}>{progress_comparison.headline}</Text>
          </View>

          {/* Core metrics */}
          <Text style={styles.progressionSubtitle}>PERFORMANCE METRICS</Text>
          {coreDeltaRows.map(({ key, label, icon, d }) => (
            <DeltaRow
              key={key}
              label={label}
              icon={icon}
              change={d.change}
              deltaLabel={d.label}
            />
          ))}

          {/* Behavioral */}
          <Text style={[styles.progressionSubtitle, { marginTop: spacing.md }]}>BEHAVIOURAL METRICS</Text>
          {behavioralDeltaRows.map(({ key, label, icon, d }) => (
            <DeltaRow
              key={key}
              label={label}
              icon={icon}
              change={d.change}
              deltaLabel={d.label}
            />
          ))}
        </Card>
      )}

      {/* ── Motivational Closing ───────────────────────────────────────────── */}
      <View style={styles.closingContainer}>
        <MaterialIcons name="format-quote" size={32} color={colors.primaryTint} style={styles.quoteIcon} />
        <Text style={styles.closingText}>{llm_feedback.motivational_closing}</Text>
      </View>

      {/* ── Share Button ──────────────────────────────────────────────────── */}
      {/* <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <MaterialIcons name="share" size={20} color={colors.textPrimary} />
        <Text style={styles.shareButtonText}>Share Results</Text>
      </TouchableOpacity> */}

    </ScrollView>
  );
});

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing['4xl'] },

  // Overall Card
  overallCard: { marginBottom: spacing.base, padding: spacing.xl },
  overallHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  overallLabel: { color: colors.textMuted, fontSize: fontSize.xs, fontFamily: fonts.bold, letterSpacing: 1.2 },
  overallValue: { color: colors.textPrimary, fontSize: fontSize['5xl'], fontFamily: fonts.bold, marginTop: spacing.xs },
  deltaBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  deltaText: { fontSize: fontSize.xs, fontFamily: fonts.semiBold },
  durationRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.xs },
  durationText: { color: colors.textSecondary, fontSize: fontSize.sm, fontFamily: fonts.regular },

  // Metric Grid
  metricGrid: { marginBottom: spacing.xl },
  metricRow: { flexDirection: 'row', gap: spacing.base, marginBottom: spacing.base },

  // Shared list card styles
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  listCard: { padding: spacing.base, marginBottom: spacing.base },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderMuted,
  },
  listItemLast: { marginBottom: 0, paddingBottom: 0, borderBottomWidth: 0 },
  listText: { color: colors.textSecondary, fontSize: fontSize.base, fontFamily: fonts.regular, flex: 1 },

  // ── Filler Words (new)
  fillerCard: { padding: spacing.xl, marginBottom: spacing.base },
  fillerTopRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.lg },
  fillerRatioBlock: { alignItems: 'center' },
  fillerCountBlock: { alignItems: 'center' },
  fillerRatioValue: { color: colors.textPrimary, fontSize: fontSize['3xl'], fontFamily: fonts.bold },
  fillerCountValue: { color: colors.textPrimary, fontSize: fontSize['3xl'], fontFamily: fonts.bold },
  fillerRatioLabel: { color: colors.textSecondary, fontSize: fontSize.sm, fontFamily: fonts.medium, marginTop: 2 },
  fillerDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderMuted, marginBottom: spacing.lg },
  fillerWordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  fillerWordCell: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    minWidth: 60,
  },
  fillerWordCellActive: {
    backgroundColor: colors.negative + '15',
    borderColor: colors.negative + '40',
  },
  fillerWordCount: {
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    color: colors.textMuted,
  },
  fillerWordCountActive: { color: colors.negative },
  fillerWordLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  fillerNoDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    justifyContent: 'center',
  },
  fillerNoDataText: { color: colors.positive, fontSize: fontSize.sm, fontFamily: fonts.medium },

  // ── Timestamped Moments
  momentItem: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderMuted,
  },
  momentTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  momentTime: { color: colors.primary, fontSize: fontSize.xs, fontFamily: fonts.semiBold },
  momentNote: { color: colors.textSecondary, fontSize: fontSize.sm, fontFamily: fonts.regular, lineHeight: 20 },

  // ── Progression Dropdown
  progressionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  progressionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressionHeaderText: { color: colors.textPrimary, fontSize: fontSize.md, fontFamily: fonts.semiBold },
  progressionCard: { padding: spacing.base, marginBottom: spacing.base },
  progressionHeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: radius.sm,
  },
  progressionHeadlineText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    flex: 1,
  },
  progressionSubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    letterSpacing: 1,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },

  // ── Closing & Share
  closingContainer: {
    marginTop: spacing['2xl'],
    marginBottom: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  quoteIcon: { marginBottom: -spacing.sm },
  closingText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.medium,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  shareButtonText: { color: colors.textPrimary, fontSize: fontSize.md, fontFamily: fonts.semiBold },
});