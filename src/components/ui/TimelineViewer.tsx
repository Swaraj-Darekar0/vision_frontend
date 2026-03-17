import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { TimelineClip } from '../../utils/mergeTimelineEvents';
import { colors } from '../../theme/colors';
import { fonts, fontSize } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

// Event type → color + icon mapping
const EVENT_META: Record<string, { color: string; icon: string; label: string }> = {
  rapid_speech_segment:    { color: '#F59E0B', icon: 'speed',        label: 'Fast pace'   },
  monotone_segment:        { color: '#3B8BD4', icon: 'graphic_eq',   label: 'Monotone'    },
  vocal_instability_spike: { color: '#EF4444', icon: 'mic_off',      label: 'Instability' },
  excessive_pause:         { color: '#8B5CF6', icon: 'pause_circle',  label: 'Long pause'  },
};

interface Props {
  clips:         TimelineClip[];
  localVideoUri: string | null;   // null = text-only mode (old sessions)
}

export const TimelineViewer: React.FC<Props> = ({ clips, localVideoUri }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  // Initialize the video player
  const player = useVideoPlayer(localVideoUri || '', (player) => {
    player.loop = false;
    player.muted = false;
  });

  const handleRowTap = (clip: TimelineClip) => {
    if (!localVideoUri) return;

    if (expandedIndex === clip.index) {
      // Collapse
      player.pause();
      setExpandedIndex(null);
      return;
    }

    setExpandedIndex(clip.index);

    // Seek to clip start and play
    player.seekBy(clip.timeStart - player.currentTime);
    player.play();
  };

  // Monitor playback to pause at clip end
  useEffect(() => {
    if (expandedIndex === null) return;
    
    const clip = clips.find(c => c.index === expandedIndex);
    if (!clip) return;

    const subscription = player.addListener('timeUpdate', (event) => {
      if (event.currentTime >= clip.timeEnd) {
        player.pause();
      }
    });

    return () => subscription.remove();
  }, [expandedIndex, player, clips]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="timeline" size={18} color={colors.primary} />
        <Text style={styles.headerText}>Feedback Timeline</Text>
        {!localVideoUri && (
          <Text style={styles.textOnlyBadge}>text only</Text>
        )}
      </View>

      {clips.map((clip) => {
        const meta   = EVENT_META[clip.eventType] ?? EVENT_META['rapid_speech_segment'];
        const isOpen = expandedIndex === clip.index;

        return (
          <View key={clip.index} style={styles.row}>
            {/* Timeline spine */}
            <View style={styles.spineCol}>
              <View style={[styles.dot, { backgroundColor: meta.color }]} />
              {clip.index < clips.length - 1 && <View style={styles.spineLine} />}
            </View>

            {/* Content */}
            <View style={styles.contentCol}>
              <TouchableOpacity
                style={styles.rowHeader}
                onPress={() => handleRowTap(clip)}
                disabled={!localVideoUri}
                activeOpacity={localVideoUri ? 0.7 : 1}
              >
                {/* Time + event badge */}
                <View style={styles.rowMeta}>
                  <Text style={styles.timeLabel}>{clip.timeLabel}</Text>
                  <View style={[styles.eventBadge, { backgroundColor: meta.color + '22',
                    borderColor: meta.color + '55' }]}>
                    <MaterialIcons name={meta.icon as any} size={11} color={meta.color} />
                    <Text style={[styles.eventLabel, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>

                {/* Play indicator — only when video available */}
                {localVideoUri && (
                  <MaterialIcons
                    name={isOpen ? 'expand-less' : 'play-circle-outline'}
                    size={20}
                    color={isOpen ? colors.primary : colors.textMuted}
                  />
                )}
              </TouchableOpacity>

              {/* Coach note — always visible */}
              <Text style={styles.note}>{clip.coachNote}</Text>

              {/* Inline video player — only when expanded and video exists */}
              {isOpen && localVideoUri && (
                <View style={styles.playerWrapper}>
                  <VideoView
                    player={player}
                    style={styles.player}
                    contentFit="contain"
                    allowsFullscreen={false}
                    allowsPictureInPicture={false}
                  />
                  {/* Scrub bar showing clip position within full video */}
                  <View style={styles.scrubBar}>
                    <View style={[styles.scrubFill, {
                      marginLeft: player.duration ? `${(clip.timeStart / player.duration) * 100}%` : 0,
                      width:      player.duration ? `${((clip.timeEnd - clip.timeStart) / player.duration) * 100}%` : 0,
                    }]} />
                  </View>
                  <Text style={styles.clipDuration}>
                    {clip.timeLabel} — {formatSecondsToMMSS(clip.timeEnd)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

function formatSecondsToMMSS(s: number): string {
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: spacing.base,
    borderWidth: 0.5,
    borderColor: colors.borderDark,
    marginVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
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
    gap: 12,
    marginBottom: 4,
  },
  spineCol: {
    alignItems: 'center',
    width: 12,
    paddingTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  spineLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: colors.borderMuted,
    marginTop: 4,
    marginBottom: -4,
  },
  contentCol: {
    flex: 1,
    paddingBottom: spacing.base,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 0.5,
  },
  eventLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  playerWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginTop: 4,
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
