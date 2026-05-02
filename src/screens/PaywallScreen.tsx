import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, fontSize, radius, spacing } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { SUBSCRIPTION } from '../theme/constants';
import { useAuthStore } from '../store/authStore';
import { usePlanStore } from '../store/planStore';
import { useAdaptiveLayout } from '../hooks/useAdaptiveLayout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Paywall'>;

const PaywallScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, activateSubscription } = useAuthStore();
  const { ensurePlan } = usePlanStore();
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(false);
  const { bottomSpacing, cardPadding, horizontalPadding, isNarrow, topSpacing } = useAdaptiveLayout();

  const handleContinue = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await activateSubscription(selectedPlan);
      await ensurePlan({
        userId: user.id,
        profile: {
          identity: user.identity ?? null,
          work_domain: user.work_domain ?? null,
          interest_areas: user.interest_areas ?? [],
          speaking_goal: user.speaking_goal ?? null,
          practice_frequency: user.practice_frequency ?? null,
        },
        speakerLevel: user.speaker_level || 'developing',
      });
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingHorizontal: horizontalPadding,
          paddingTop: topSpacing,
          paddingBottom: bottomSpacing,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Your weekly plan is ready.</Text>
      <Text style={styles.subtitle}>
        Pick a plan to unlock today&apos;s sessions. Weekly is the default, monthly stays active for users who want a longer runway.
      </Text>

      <TouchableOpacity
        style={[styles.planCard, { padding: cardPadding }, selectedPlan === 'weekly' && styles.planCardActive]}
        onPress={() => setSelectedPlan('weekly')}
      >
        <View style={[styles.planRow, isNarrow && styles.planRowCompact]}>
          <Text style={styles.planTitle}>Weekly</Text>
          <Text style={styles.planBadge}>Recommended</Text>
        </View>
        <Text style={styles.planPrice}>{SUBSCRIPTION.DISPLAY_WEEKLY}</Text>
        <Text style={styles.planStrike}>Rs 120</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.planCard, { padding: cardPadding }, selectedPlan === 'monthly' && styles.planCardActive]}
        onPress={() => setSelectedPlan('monthly')}
      >
        <Text style={styles.planTitle}>Monthly</Text>
        <Text style={styles.planPrice}>{SUBSCRIPTION.DISPLAY_MONTHLY}</Text>
        <Text style={styles.planHint}>Stay active for a full month without reactivating every week.</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={() => void handleContinue()} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Setting up your plan...' : 'Continue'}</Text>
        </TouchableOpacity>
        <Text style={styles.footerText}>Both plans use the same adaptive system. Access locks again when the subscription period ends.</Text>
      </View>
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
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize['3xl'],
    fontFamily: fonts.extraBold,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  planCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    padding: spacing.xl,
    marginBottom: spacing.base,
  },
  planCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  planRowCompact: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  planTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
  },
  planBadge: {
    color: '#8DB7FF',
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
  },
  planPrice: {
    color: colors.textPrimary,
    fontSize: fontSize['2xl'],
    fontFamily: fonts.numeric,
    marginBottom: spacing.xs,
  },
  planStrike: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: fonts.numeric,
    textDecorationLine: 'line-through',
  },
  planHint: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    lineHeight: 20,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.lg,
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
    fontFamily: fonts.bold,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});

export default PaywallScreen;
