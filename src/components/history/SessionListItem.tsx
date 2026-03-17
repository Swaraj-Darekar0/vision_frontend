import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fonts, fontSize, spacing, radius } from '../../theme';
import { SessionListEntry } from '../../types/cache';
import { scoreToStreakColor } from '../../utils/scoreToColor';
import { toPercent } from '../../utils/toPercent';
import { formatSessionDate } from '../../utils/formatDate';

interface SessionListItemProps {
  entry: SessionListEntry;
  onPress: () => void;
  onDelete: () => void;
}

export const SessionListItem: React.FC<SessionListItemProps> = ({ entry, onPress, onDelete }) => (
  <View style={styles.container}>
    <TouchableOpacity 
      style={styles.itemMain} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.dot, { backgroundColor: scoreToStreakColor(entry.overallScore) }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>{entry.topicTitle}</Text>
          <Text style={styles.date}>{formatSessionDate(entry.processedAt)}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.subtitle}>
            {entry.durationLabel}  •  Overall: {toPercent(entry.overallScore)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
    
    <TouchableOpacity 
      style={styles.deleteButton} 
      onPress={onDelete}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel="Delete session"
    >
      <MaterialIcons name="delete-outline" size={22} color={colors.textMuted} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
    overflow: 'hidden',
  },
  itemMain: {
    flex: 1,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: spacing.base,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.borderDark,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.base,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
    flex: 1,
    marginRight: spacing.sm,
  },
  date: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
  },
});
