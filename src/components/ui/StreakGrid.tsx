import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, spacing } from '../../theme';

type StreakSquareState = 'completed' | 'missed' | 'pending' | 'today';

interface StreakGridProps {
  totalSquares?: number;
  completedSquares?: number;
  squareStates?: StreakSquareState[];
}

const StreakSquare = ({ state, index }: { state: StreakSquareState; index: number }) => {
  const pulse = useSharedValue(1);
  const shouldPulse = state === 'today';

  React.useEffect(() => {
    if (shouldPulse) {
      pulse.value = withRepeat(
        withTiming(1.16, {
          duration: 850,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true,
      );
      return;
    }

    pulse.value = withTiming(1, { duration: 180 });
  }, [pulse, shouldPulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const color =
    state === 'completed'
      ? colors.dashboardSuccess
      : state === 'missed'
      ? colors.recordingRedBg
      : colors.streakEmpty;
  const borderColor =
    state === 'missed'
      ? colors.recordingRedBorder
      : state === 'today'
      ? colors.dashboardSuccess
      : colors.dashboardBorderFaint;

  return (
    <Animated.View
      style={[styles.square, { backgroundColor: color, borderColor }, animatedStyle]}
      accessibilityLabel={
        state === 'completed'
          ? 'Completed weekly session'
          : state === 'missed'
          ? 'Missed weekly session'
          : state === 'today'
          ? 'Today pending weekly session'
          : 'Pending weekly session'
      }
    />
  );
};

export const StreakGrid: React.FC<StreakGridProps> = ({ totalSquares = 8, completedSquares = 0, squareStates }) => {
  const safeSquareCount = Math.max(0, squareStates?.length ?? totalSquares);
  const safeCompletedCount = Math.min(Math.max(0, completedSquares), safeSquareCount);
  const squares = Array.from({ length: safeSquareCount });

  return (
    <View style={styles.container}>
      {squares.map((_, i) => {
        const state = squareStates?.[i] ?? (i < safeCompletedCount ? 'completed' : 'pending');
        return (
          <StreakSquare key={i} state={state} index={i} />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    width: (16 * 4) + (8 * 3), // 4 columns + gaps
  },
  square: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
});
