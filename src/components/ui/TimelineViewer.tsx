import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { TimelineClip } from '../../utils/mergeTimelineEvents';
import { colors } from '../../theme/colors';
import { fonts, fontSize } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

const EVENT_META: Record<string, { color: string; icon: string }> = {
  rapid_speech_segment: { color: '#F59E0B', icon: 'speed' },
  monotone_segment: { color: '#3B8BD4', icon: 'equalizer' },
  vocal_instability_spike: { color: '#EF4444', icon: 'mic-off' },
  excessive_pause: { color: '#8B5CF6', icon: 'pause-circle-outline' },
  high_fumble_spike: { color: '#EF4444', icon: 'warning-amber' },
  review_moment: { color: '#1152D4', icon: 'insights' },
};

function resolveEventMeta(eventType: string) {
  const direct = EVENT_META[eventType];
  if (direct) return direct;

  const normalized = eventType.toLowerCase();
  if (normalized.includes('pause')) return EVENT_META.excessive_pause;
  if (normalized.includes('fumble')) return EVENT_META.high_fumble_spike;
  if (normalized.includes('rapid') || normalized.includes('speed')) return EVENT_META.rapid_speech_segment;
  if (normalized.includes('monotone')) return EVENT_META.monotone_segment;
  if (normalized.includes('instability')) return EVENT_META.vocal_instability_spike;

  return EVENT_META.review_moment;
}

function humanizeEventLabel(eventType: string) {
  return eventType
    .split('+')
    .map((part) =>
      part
        .trim()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    )
    .join(' + ');
}

function formatSecondsToMMSS(seconds: number) {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

interface Props {
  clips: TimelineClip[];
  localVideoUri: string | null;
}

export const TimelineViewer: React.FC<Props> = ({ clips, localVideoUri }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const player = useVideoPlayer(localVideoUri || '', (instance) => {
    instance.loop = false;
    instance.muted = false;
  });

  const handleRowTap = (clip: TimelineClip) => {
    if (!localVideoUri) return;

    if (expandedIndex === clip.index) {
      player.pause();
      setExpandedIndex(null);
      return;
    }

    setExpandedIndex(clip.index);
    player.seekBy(clip.timeStart - player.currentTime);
    player.play();
  };

  useEffect(() => {
    if (expandedIndex === null) return;

    const clip = clips.find((entry) => entry.index === expandedIndex);
    if (!clip) return;

    const subscription = player.addListener('timeUpdate', (event) => {
      if (event.currentTime >= clip.timeEnd) {
        player.pause();
      }
    });

    return () => subscription.remove();
  }, [clips, expandedIndex, player]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="timeline" size={18} color={colors.primary} />
        <Text style={styles.headerText}>Feedback Timeline</Text>
        {!localVideoUri ? <Text style={styles.textOnlyBadge}>text only</Text> : null}
      </View>

      {clips.map((clip, index) => {
        const meta = resolveEventMeta(clip.eventType);
        const isOpen = expandedIndex === clip.index;
        const isLast = index === clips.length - 1;

        return (
          <View key={clip.index} style={[styles.row, isLast && styles.rowLast]}>
            <View style={styles.spineCol}>
              <View style={[styles.dot, { backgroundColor: meta.color }]} />
              {!isLast ? <View style={styles.spineLine} /> : null}
            </View>

            <View style={styles.contentCol}>
              <View style={styles.rowHeader}>
                <View style={styles.rowMeta}>
                  <Text style={styles.timeLabel}>{clip.timeLabel}</Text>
                  {/* <View
                    style={[
                      styles.eventBadge,
                      {
                        backgroundColor: meta.color + '22',
                        borderColor: meta.color + '55',
                      },
                    ]}
                  >
                    <MaterialIcons name={meta.icon as any} size={12} color={meta.color} />
                    <Text style={[styles.eventLabel, { color: meta.color }]}>
                      {humanizeEventLabel(clip.eventType)}
                    </Text>
                  </View> */}
                                  {localVideoUri ? (
                  <TouchableOpacity
                    style={[styles.playButton, isOpen && styles.playButtonActive]}
                    onPress={() => handleRowTap(clip)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name={isOpen ? 'pause-circle-outline' : 'play-circle-outline'}
                      size={22}
                      color={isOpen ? colors.primary : colors.textSecondary}
                    />
                  </TouchableOpacity>
                ) : null}
                </View>


              </View>

              <Text style={styles.note}>{clip.coachNote}</Text>

              {isOpen && localVideoUri ? (
                <View style={styles.playerWrapper}>
                  <VideoView player={player} style={styles.player} contentFit="contain" />
                  <View style={styles.scrubBar}>
                    <View
                      style={[
                        styles.scrubFill,
                        {
                          marginLeft: player.duration ? `${(clip.timeStart / player.duration) * 100}%` : 0,
                          width: player.duration
                            ? `${((clip.timeEnd - clip.timeStart) / player.duration) * 100}%`
                            : 0,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.clipDuration}>
                    {clip.timeLabel} - {formatSecondsToMMSS(clip.timeEnd)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 0.5,
    borderColor: colors.borderDark,
    marginVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    flex: 1,
  },
  textOnlyBadge: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: colors.borderMuted,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  rowLast: {
    marginBottom: 0,
  },
  spineCol: {
    width: 16,
    alignItems: 'center',
    paddingTop: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  spineLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: colors.borderMuted,
    marginTop: 6,
    marginBottom: -8,
  },
  contentCol: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowMeta: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  timeLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  eventLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    lineHeight: 16,
    flex: 1,
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  playButtonActive: {
    borderColor: colors.primary + '66',
    backgroundColor: colors.primary + '12',
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 24,
    paddingRight: spacing.xs,
    marginBottom: spacing.sm,
  },
  playerWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginTop: spacing.xs,
  },
  player: {
    width: '100%',
    height: 200,
  },
  scrubBar: {
    height: 3,
    backgroundColor: colors.borderMuted,
    marginHorizontal: spacing.sm,
    marginTop: 6,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scrubFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  clipDuration: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 6,
  },
});
