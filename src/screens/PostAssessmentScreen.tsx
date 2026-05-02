import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, fontSize, radius, spacing } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { ResultsView } from '../components/ui/ResultsView';
import { SpeakerLevelBadge } from '../components/ui/SpeakerLevelBadge';
import { useSessionStore } from '../store/sessionStore';
import { classifySpeakerLevel } from '../utils/classifySpeakerLevel';
import { deriveFocusAreas } from '../utils/deriveFocusAreas';
import { useAuthStore } from '../store/authStore';
import { useAdaptiveLayout } from '../hooks/useAdaptiveLayout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'PostAssessment'>;

const PostAssessmentScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { latestResult, elapsedSeconds, localVideoUri } = useSessionStore();
  const { setSpeakerLevel, markDiagnosticComplete } = useAuthStore();
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const { bottomSpacing, horizontalPadding, isNarrow } = useAdaptiveLayout();

  const level = useMemo(() => {
    if (!latestResult) return 'developing';
    return classifySpeakerLevel(latestResult.overall_scores);
  }, [latestResult]);

  const focusAreas = useMemo(() => {
    if (!latestResult) return [];
    return deriveFocusAreas(latestResult.overall_scores);
  }, [latestResult]);

  if (!latestResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No diagnostic result found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleReady = async () => {
    await setSpeakerLevel(level);
    await markDiagnosticComplete();
    navigation.replace('PersonalizationOnboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: bottomSpacing + spacing['2xl'],
          },
        ]}
      >
        <SpeakerLevelBadge level={level} />

        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            You speak with potential. The analysis identified specific patterns holding you back and a plan to fix them.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Your Two Key Focus Areas This Month</Text>
        {focusAreas.map((focus) => (
          <View key={focus.key} style={styles.focusCard}>
            <Text style={styles.focusTitle}>{focus.title}</Text>
            <Text style={styles.focusDescription}>{focus.description}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.accordion} onPress={() => setAnalysisOpen((value) => !value)}>
          <Text style={styles.accordionText}>
            {analysisOpen ? 'Close Analysis' : 'See Your Full Session Analysis'}
          </Text>
        </TouchableOpacity>

        {analysisOpen ? (
          <ResultsView
            result={latestResult}
            sessionDurationLabel={`${Math.max(1, Math.round(elapsedSeconds / 60))} min`}
            localVideoUri={localVideoUri}
          />
        ) : null}

        <View style={styles.planHook}>
          <Text style={[styles.planHookTitle, isNarrow && styles.planHookTitleCompact]}>
            Let&apos;s get you for good.
          </Text>
          <Text style={styles.planHookCopy}>Your weekly plan is ready.</Text>
          <Text style={styles.planHookCopy}>
            Sessions adapt based on your progress. Your plan starts at 2 sessions/day, about 2 minutes each.
          </Text>
          <Text style={styles.planHookCopy}>As you improve, the load adjusts to match you.</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingHorizontal: horizontalPadding, paddingBottom: bottomSpacing }]}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => void handleReady()}>
          <Text style={styles.primaryButtonText}>I&apos;m Ready</Text>
        </TouchableOpacity>
        <Text style={styles.smallText}>lets get you hooked</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingTop: spacing.base,
  },
  summaryCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    lineHeight: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    marginBottom: spacing.md,
  },
  focusCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  focusTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    marginBottom: spacing.xs,
  },
  focusDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    lineHeight: 20,
  },
  accordion: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderMuted,
    marginVertical: spacing.lg,
  },
  accordionText: {
    color: '#8DB7FF',
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
    textAlign: 'center',
  },
  planHook: {
    marginTop: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  planHookTitle: {
    color: colors.textPrimary,
    fontSize: fontSize['2xl'],
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  planHookTitleCompact: {
    fontSize: fontSize.xl,
  },
  planHookCopy: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
  },
  smallText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.medium,
  },
});

export default PostAssessmentScreen;
