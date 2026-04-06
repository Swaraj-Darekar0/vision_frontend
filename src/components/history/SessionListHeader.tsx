import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSize, radius, spacing } from '../../theme';
import { GlassSurface } from '../ui/GlassSurface';

interface SessionListHeaderProps {
  count: number;
  onBack: () => void;
  onSync: () => void;
  isSyncing?: boolean;
}

export const SessionListHeader: React.FC<SessionListHeaderProps> = ({
  count,
  onBack,
  onSync,
  isSyncing,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.sm) + spacing.xs }]}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack}>
          <GlassSurface style={styles.iconButton}>
            <View style={styles.iconButtonInner}>
              <MaterialIcons name="chevron-left" size={28} color={colors.textPrimary} />
            </View>
          </GlassSurface>
        </Pressable>

        <Pressable onPress={onSync} disabled={isSyncing}>
          <GlassSurface style={styles.syncButton}>
            <View style={styles.syncButtonInner}>
              {isSyncing ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <>
                  <MaterialIcons name="sync" size={18} color={colors.textPrimary} />
                  <Text style={styles.syncText}>Sync</Text>
                </>
              )}
            </View>
          </GlassSurface>
        </Pressable>
      </View>

      <GlassSurface style={styles.copyBlock}>
        <Text style={styles.eyebrow}>Session archive</Text>
        <View style={styles.badgeRow}>
          <GlassSurface style={styles.countBadge}>
            <Text style={styles.countValue}>{count}</Text>
            <Text style={styles.countLabel}>{count === 1 ? 'session saved' : 'sessions saved'}</Text>
          </GlassSurface>
          <Text style={styles.helperText}>Tap once to reveal, tap again to open details.</Text>
        </View>
      </GlassSurface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.lg,
    backgroundColor: colors.backgroundDark,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
  },
  iconButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButton: {
    minHeight: 44,
    borderRadius: radius.full,
    paddingHorizontal: spacing.base,
  },
  syncButtonInner: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    columnGap: spacing.sm,
  },
  syncText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontFamily: fonts.semiBold,
  },
  copyBlock: {
    marginTop: spacing.lg,
    padding: spacing.base,
  },
  eyebrow: {
    color: colors.dashboardTextMuted,
    fontSize: fontSize.xs,
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  title: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSize['2xl'],
    lineHeight: 32,
    fontFamily: fonts.bold,
    maxWidth: '90%',
  },
  badgeRow: {
    marginTop: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  countValue: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontFamily: fonts.numeric,
  },
  countLabel: {
    marginLeft: spacing.sm,
    color: colors.dashboardTextSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
  },
  helperText: {
    flex: 1,
    marginLeft: spacing.base,
    color: colors.dashboardTextSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontFamily: fonts.regular,
    textAlign: 'right',
  },
});
