import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, fontSize, radius, spacing } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { useAuthStore } from '../store/authStore';
import { usePlanStore } from '../store/planStore';
import { useAdaptiveLayout } from '../hooks/useAdaptiveLayout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'WeeklyReview'>;

const WeeklyReviewScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { weeklyReview, markReviewShown } = usePlanStore();
  const { bottomSpacing, cardPadding, horizontalPadding, isNarrow, topSpacing } = useAdaptiveLayout();

  const handleClose = async () => {
    if (user?.id && weeklyReview?.week_number) {
      await markReviewShown(user.id, weeklyReview.week_number);
    }
    navigation.goBack();
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
      <View style={[styles.card, { padding: cardPadding }]}>
        <Text style={styles.eyebrow}>WEEKLY REVIEW</Text>
        <Text style={[styles.title, isNarrow && styles.titleCompact]}>
          Week {weeklyReview?.week_number || 1}
        </Text>
        <Text style={styles.narrative}>
          {weeklyReview?.review_narrative || 'Your first review will appear after you complete a full week of sessions.'}
        </Text>

        <View style={styles.metrics}>
          <Text style={styles.metric}>Completion: {Math.round((weeklyReview?.completion_rate || 0) * 100)}%</Text>
          <Text style={styles.metric}>Strongest: {weeklyReview?.strongest_metric || '--'}</Text>
          <Text style={styles.metric}>Needs work: {weeklyReview?.weakest_metric || '--'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => void handleClose()}>
        <Text style={styles.buttonText}>Start Next Week</Text>
      </TouchableOpacity>
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
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  eyebrow: {
    color: '#8DB7FF',
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize['3xl'],
    fontFamily: fonts.bold,
    marginBottom: spacing.md,
  },
  titleCompact: {
    fontSize: fontSize['2xl'],
  },
  narrative: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  metrics: {
    gap: spacing.sm,
  },
  metric: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
  },
});

export default WeeklyReviewScreen;
