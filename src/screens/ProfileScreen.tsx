import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { colors, fonts, fontSize, radius, spacing } from '../theme';
import { useAdaptiveLayout } from '../hooks/useAdaptiveLayout';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

const formatDate = (value?: string | null) => {
  if (!value) return 'Not available';

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD MMM YYYY') : 'Not available';
};

const formatStatus = (value?: string | null) => {
  if (!value) return 'Free';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuthStore();
  const { bottomSpacing, horizontalPadding, topSpacing } = useAdaptiveLayout();
  const [subscriptionOpen, setSubscriptionOpen] = useState(user?.subscription_status === 'active');

  const displayName = user?.display_name?.trim() || 'User';
  const initial = useMemo(() => displayName.charAt(0).toUpperCase(), [displayName]);
  const status = user?.subscription_status ?? 'free';
  const statusTone = status === 'active' ? colors.dashboardSuccess : status === 'expired' ? colors.recordingRed : colors.dashboardTextMuted;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: topSpacing, paddingHorizontal: horizontalPadding }]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.dashboardTextPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: bottomSpacing + spacing['2xl'],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {user?.email || 'No email available'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <TouchableOpacity
            style={styles.subscriptionCard}
            onPress={() => setSubscriptionOpen((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel="Toggle subscription details"
          >
            <View style={styles.subscriptionHeader}>
              <View>
                <Text style={styles.cardLabel}>Current status</Text>
                <Text style={[styles.statusText, { color: statusTone }]}>{formatStatus(status)}</Text>
              </View>
              <MaterialIcons
                name={subscriptionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={28}
                color={colors.dashboardIconMuted}
              />
            </View>

            {subscriptionOpen && (
              <View style={styles.periodPanel}>
                <View style={styles.periodRow}>
                  <Text style={styles.periodLabel}>Start</Text>
                  <Text style={styles.periodValue}>{formatDate(user?.subscription_start)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.periodRow}>
                  <Text style={styles.periodLabel}>End</Text>
                  <Text style={styles.periodValue}>{formatDate(user?.subscription_end)}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <TouchableOpacity style={styles.settingRow} onPress={() => void handleLogout()} accessibilityRole="button">
            <View style={styles.settingIcon}>
              <MaterialIcons name="logout" size={21} color={colors.recordingRed} />
            </View>
            <Text style={styles.logoutText}>Log out</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.dashboardIconMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    minHeight: 56,
    justifyContent: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.dashboardSurfaceBase,
    borderWidth: 1,
    borderColor: colors.dashboardBorderFaint,
  },
  content: {
    flexGrow: 1,
    paddingTop: spacing.md,
  },
  identity: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dashboardGlassLight,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.34)',
    marginBottom: spacing.lg,
  },
  avatarText: {
    color: colors.dashboardOnLightPrimary,
    fontSize: 38,
    fontFamily: fonts.extraBold,
  },
  name: {
    color: colors.dashboardTextPrimary,
    fontSize: fontSize['2xl'],
    fontFamily: fonts.bold,
    maxWidth: '92%',
    marginBottom: spacing.xs,
  },
  email: {
    color: colors.dashboardTextSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    maxWidth: '92%',
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    color: colors.dashboardTextPrimary,
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    marginBottom: spacing.md,
  },
  subscriptionCard: {
    backgroundColor: colors.dashboardSurfaceBase,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dashboardBorderSoft,
    padding: spacing.lg,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: colors.dashboardTextMuted,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    marginBottom: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
  },
  periodPanel: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.dashboardBorderFaint,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  periodLabel: {
    color: colors.dashboardTextSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.medium,
  },
  periodValue: {
    color: colors.dashboardTextPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
    textAlign: 'right',
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.dashboardBorderFaint,
  },
  settingRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dashboardSurfaceBase,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dashboardBorderSoft,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.recordingRedBg,
  },
  logoutText: {
    color: colors.recordingRed,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
    flex: 1,
  },
});

export default ProfileScreen;
