import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from '../../theme';

interface Props {
  question: string;
  subtext: string;
  options: string[];
  multiSelect: boolean;
  selected: string[];
  onSelect: (selected: string[]) => void;
  maxSelections?: number;
  contentPadding?: number;
  bottomPadding?: number;
}

export const OnboardingQuestion: React.FC<Props> = ({
  question,
  subtext,
  options,
  multiSelect,
  selected,
  onSelect,
  maxSelections = 4,
  contentPadding = spacing.base,
  bottomPadding = spacing['3xl'],
}) => {
  const toggleOption = (option: string) => {
    if (multiSelect) {
      if (selected.includes(option)) {
        onSelect(selected.filter((value) => value !== option));
        return;
      }
      if (selected.length >= maxSelections) {
        return;
      }
      onSelect([...selected, option]);
      return;
    }

    onSelect([option]);
  };

  return (
    <View style={[styles.container, { paddingHorizontal: contentPadding }]}>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.subtext}>{subtext}</Text>
      <ScrollView
        contentContainerStyle={[styles.optionGrid, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => toggleOption(option)}
              style={[styles.option, active && styles.optionActive]}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  question: {
    color: colors.textPrimary,
    fontSize: fontSize['2xl'],
    fontFamily: fonts.bold,
    marginBottom: spacing.sm,
  },
  subtext: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.surfaceDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionActive: {
    backgroundColor: colors.recordingRed,
    borderColor: colors.recordingRed,
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
  },
  optionTextActive: {
    color: colors.textPrimary,
  },
});
