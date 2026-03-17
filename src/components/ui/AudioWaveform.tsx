import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  withDelay,
  Easing 
} from 'react-native-reanimated';
import { colors, spacing } from '../../theme';

const BARS = [
  { minH: 4, maxH: 12, delay: 0   },
  { minH: 4, maxH: 20, delay: 75  },
  { minH: 4, maxH: 8,  delay: 150 },
  { minH: 4, maxH: 16, delay: 225 },
  { minH: 4, maxH: 12, delay: 300 },
];

const WaveBar = ({ minH, maxH, delay }: { minH: number, maxH: number, delay: number }) => {
  const height = useSharedValue(minH);

  useEffect(() => {
    height.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(maxH, { duration: 400, easing: Easing.inOut(Easing.quad) }),
          withTiming(minH, { duration: 400, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return <Animated.View style={[styles.bar, animatedStyle]} />;
};

export const AudioWaveform = () => (
  <View style={styles.container}>
    {BARS.map((bar, i) => (
      <WaveBar key={i} {...bar} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 24,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
