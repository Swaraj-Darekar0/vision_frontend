import React, { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSize, radius, spacing } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { OnboardingQuestion } from '../components/onboarding/OnboardingQuestion';
import { useAuthStore } from '../store/authStore';
import { UserPersonalizationProfile } from '../types/plan';
import { useAdaptiveLayout } from '../hooks/useAdaptiveLayout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'PersonalizationOnboarding'>;

const QUESTIONS = [
  {
    key: 'identity',
    question: 'Who are you?',
    subtext: 'Pick the one that best describes you right now.',
    multiSelect: false,
    options: [
      'Student',
      'Working Professional',
      'Entrepreneur',
      'Manager / Leader',
      'Creative / Artist',
      'Freelancer',
      'Educator / Trainer',
      'Job Seeker',
      'Career Changer',
      'Business Owner',
      'Team Lead',
      'Executive',
    ],
  },
  {
    key: 'work_domain',
    question: "What's your work domain?",
    subtext: 'Pick the closest field so we can tailor subject matter.',
    multiSelect: false,
    options: [
      'Technology & Engineering',
      'Business & Finance',
      'Healthcare & Medicine',
      'Education & Academia',
      'Law & Policy',
      'Creative & Media',
      'Sales & Marketing',
      'Operations & Logistics',
      'Science & Research',
      'Design & Architecture',
      'Hospitality & Service',
      'Social Work & NGO',
      'Sports & Fitness',
      'Arts & Entertainment',
      'Other / Not Listed',
    ],
  },
  {
    key: 'interest_areas',
    question: 'What topics genuinely interest you?',
    subtext: 'Pick up to 4 areas you actually enjoy talking about.',
    multiSelect: true,
    options: [
      'Leadership & Management',
      'Personal Growth & Habits',
      'Technology & Innovation',
      'Health & Wellness',
      'Finance & Investing',
      'Philosophy & Ideas',
      'Science & Discovery',
      'History & Society',
      'Entrepreneurship',
      'Environment & Sustainability',
      'Sports & Competition',
      'Arts & Culture',
      'Relationships & Communication',
      'Psychology & Behavior',
      'Food & Lifestyle',
      'Travel & Exploration',
      'Education & Learning',
      'Politics & Current Events',
    ],
  },
  {
    key: 'speaking_goal',
    question: 'Do you have a specific speaking goal?',
    subtext: 'Choose the improvement that matters most right now.',
    multiSelect: false,
    options: [
      'I want to stop saying "um" and "uh"',
      'I want to speak with more confidence',
      'I want to be clearer and easier to understand',
      'I want to slow down and not rush',
      'I want to sound more authoritative',
      'I want to be better in meetings and presentations',
      'I want to handle pressure without freezing',
      'I want to tell better stories',
      'I want to improve for job interviews',
      'I just want to be a better communicator overall',
    ],
  },
  {
    key: 'practice_frequency',
    question: 'How often can you realistically practice?',
    subtext: 'Be realistic. The plan adapts, but it starts here.',
    multiSelect: false,
    options: [
      "Once a day, every day - I'm committed",
      "Once a day, most days - I'll try my best",
      'A few times a week - life is busy',
      'Whenever I can - no fixed schedule',
    ],
  },
] as const;

const PersonalizationOnboardingScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { updatePersonalizationProfile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { bottomSpacing, horizontalPadding, isNarrow, topSpacing } = useAdaptiveLayout();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  const current = QUESTIONS[step];
  const selected = answers[current.key] || [];
  const canContinue = selected.length > 0;
  const progressLabel = `${step + 1} of ${QUESTIONS.length}`;
  const isLastStep = step === QUESTIONS.length - 1;

  const profile = useMemo<UserPersonalizationProfile>(() => ({
    identity: answers.identity?.[0] || null,
    work_domain: answers.work_domain?.[0] || null,
    interest_areas: answers.interest_areas || [],
    speaking_goal: answers.speaking_goal?.[0] || null,
    practice_frequency: answers.practice_frequency?.[0] || null,
  }), [answers]);

  const handleContinue = async () => {
    if (!canContinue) {
      return;
    }

    if (!isLastStep) {
      setStep((value) => value + 1);
      return;
    }

    await updatePersonalizationProfile(profile);
    navigation.replace('Paywall', { source: 'post_assessment' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, topSpacing),
            paddingHorizontal: horizontalPadding,
          },
        ]}
      >
        <TouchableOpacity disabled={step === 0} onPress={() => setStep((value) => Math.max(0, value - 1))}>
          <Text style={[styles.backText, step === 0 && styles.backTextMuted]}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.progress}>{progressLabel}</Text>
        <View style={styles.placeholder} />
      </View>

      {step === 0 ? (
        <View style={[styles.intro, { paddingHorizontal: horizontalPadding }]}>
          <Text style={[styles.introTitle, isNarrow && styles.introTitleCompact]}>
            One last step before your plan.
          </Text>
          <Text style={styles.introCopy}>
            We&apos;ll ask 5 quick questions so your sessions feel relevant to your real life, not like a generic script.
          </Text>
          <Text style={styles.introHint}>No typing. Just tap to select.</Text>
        </View>
      ) : null}

      <OnboardingQuestion
        question={current.question}
        subtext={current.subtext}
        options={current.options as unknown as string[]}
        multiSelect={current.multiSelect}
        selected={selected}
        onSelect={(next) => setAnswers((value) => ({ ...value, [current.key]: next }))}
        contentPadding={horizontalPadding}
        bottomPadding={bottomSpacing}
      />

      <TouchableOpacity
        style={[
          styles.button,
          {
            marginHorizontal: horizontalPadding,
            marginBottom: Math.max(bottomSpacing, spacing.sm),
          },
          !canContinue && styles.buttonDisabled,
        ]}
        disabled={!canContinue}
        onPress={() => void handleContinue()}
      >
        <Text style={styles.buttonText}>{isLastStep ? 'Build My Plan' : 'Continue'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 0,
    marginBottom: spacing.lg,
  },
  backText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontFamily: fonts.semiBold,
  },
  backTextMuted: {
    color: colors.textMuted,
  },
  progress: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
  },
  placeholder: {
    width: 32,
  },
  intro: {
    marginBottom: spacing.xl,
  },
  introTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    marginBottom: spacing.sm,
  },
  introTitleCompact: {
    fontSize: fontSize.lg,
  },
  introCopy: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    lineHeight: 22,
  },
  introHint: {
    color: '#8DB7FF',
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    marginTop: spacing.sm,
  },
  button: {
    backgroundColor: colors.dashboardIconPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.base,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.dashboardHeroMonoStart,
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
  },
});

export default PersonalizationOnboardingScreen;
