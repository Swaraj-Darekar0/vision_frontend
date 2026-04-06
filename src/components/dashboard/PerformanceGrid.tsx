import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { GlassSurface } from '../ui/GlassSurface';
import { MorphWallpaperSurface } from '../ui/MorphWallpaperSurface';
import { toPercent } from '../../utils/toPercent';
import { scoreToLabel } from '../../utils/scoreToLabel';
import { colors, fonts, fontSize, radius, spacing } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';

interface PerformanceGridProps {
  overallScore?: number;
  confidenceScore?: number;
  clarityScore?: number;
  engagementScore?: number;
  nervousnessScore?: number;
  isActive?: boolean;
}

type MetricSlide = {
  key: string;
  label: string;
  score?: number;
  icon: keyof typeof MaterialIcons.glyphMap;
};

export const PerformanceGrid: React.FC<PerformanceGridProps> = ({ 
  overallScore,
  confidenceScore,
  clarityScore,
  engagementScore,
  nervousnessScore,
  isActive = true,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const viewportWidth = Math.max(0, carouselWidth);
  const translateX = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const activeIndexValue = useSharedValue(0);

  const metricSlides = useMemo(
    () => [
      { key: 'confidence', label: 'Confidence', score: confidenceScore, icon: 'psychology' as const },
      { key: 'clarity', label: 'Clarity', score: clarityScore, icon: 'record-voice-over' as const },
      { key: 'engagement', label: 'Engagement', score: engagementScore, icon: 'bolt' as const },
      { key: 'nervousness', label: 'Nervousness', score: nervousnessScore, icon: 'favorite-border' as const },
    ],
    [clarityScore, confidenceScore, engagementScore, nervousnessScore],
  );

  useEffect(() => {
    if (!viewportWidth) return;

    translateX.value = -activeIndex * viewportWidth;
    activeIndexValue.value = activeIndex;
  }, [activeIndex, activeIndexValue, translateX, viewportWidth]);

  const handleCarouselLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== carouselWidth) {
      setCarouselWidth(nextWidth);
    }
  };

  const clampIndex = (index: number) => Math.max(0, Math.min(metricSlides.length - 1, index));

  const settleToIndex = (index: number) => {
    const nextIndex = clampIndex(index);
    setActiveIndex(nextIndex);
    translateX.value = withTiming(-nextIndex * viewportWidth, {
      duration: 860,
      easing: Easing.inOut(Easing.ease),
    });
    activeIndexValue.value = nextIndex;
  };

  const panGesture = Gesture.Pan()
    .enabled(viewportWidth > 0)
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      dragStartX.value = translateX.value;
    })
    .onUpdate((event) => {
      if (!viewportWidth) return;

      const minTranslateX = -(metricSlides.length - 1) * viewportWidth;
      const nextTranslateX = dragStartX.value + event.translationX;
      translateX.value = Math.max(minTranslateX, Math.min(0, nextTranslateX));
    })
    .onFinalize((event) => {
      if (!viewportWidth) return;

      const dragDistance = event.translationX;
      const threshold = viewportWidth * 0.1;
      const currentIndex = activeIndexValue.value;
      let nextIndex = currentIndex;

      if (dragDistance <= -threshold) {
        nextIndex = currentIndex + 1;
      } else if (dragDistance >= threshold) {
        nextIndex = currentIndex - 1;
      }

      nextIndex = Math.max(0, Math.min(metricSlides.length - 1, nextIndex));
      runOnJS(settleToIndex)(nextIndex);
    });

  const carouselTrackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const renderMetricSlide = ({ item }: { item: MetricSlide }) => {
    const metricLabel = item.score !== undefined ? scoreToLabel(item.score) : '--';
    const metricPercent = item.score !== undefined ? toPercent(item.score) : '--';

    return (
      <View style={[styles.slide, { width: viewportWidth }]}>
        <View style={styles.metricHeader}>
          <View style={styles.metricIconWrap}>
            <MaterialIcons name={item.icon} size={16} color={colors.dashboardOnLightPrimary} />
          </View>
          <Text style={styles.metricLabel}>{item.label}</Text>
        </View>

        <View style={styles.metricBody}>
          <Text style={styles.metricValue}>{metricLabel}</Text>
          <Text style={styles.metricSubtext}>{metricPercent}</Text>
          <Text style={styles.metricHint}>slide to view</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <MorphWallpaperSurface
        borderless
        isActive={isActive}
        style={[styles.tileShell, styles.overallMorphTile]}
      >
        <View style={styles.overallHeader}>
          <MaterialIcons name="monitor" size={20} color={colors.dashboardGlassLight} />
          <Text style={styles.overallLabel}>Overall Performance</Text>
        </View>
        <View style={styles.overallBody}>
          <Text style={styles.overallValue}>
            {overallScore !== undefined ? toPercent(overallScore) : '--'}
          </Text>
        </View>
      </MorphWallpaperSurface>
      <GlassSurface
        variant="light"
        grainOpacity={0.10}
        style={[styles.carouselCard, styles.tileShell]}
      >
        <View onLayout={handleCarouselLayout} style={styles.carouselCardInner}>
          <GestureDetector gesture={panGesture}>
            <View style={styles.carouselViewport}>
              {viewportWidth > 0 ? (
                <Animated.View
                  style={[
                    styles.carouselTrack,
                    { width: viewportWidth * metricSlides.length },
                    carouselTrackStyle,
                  ]}
                >
                  {metricSlides.map((item) => (
                    <View key={item.key} style={{ width: viewportWidth }}>
                      {renderMetricSlide({ item })}
                    </View>
                  ))}
                </Animated.View>
              ) : null}
            </View>
          </GestureDetector>
        </View>
      </GlassSurface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
    alignItems: 'stretch',
  },
  tileShell: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  overallMorphTile: {
    height: 146,
  },
  overallHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.base,
  },
  overallLabel: {
    color: colors.dashboardGlassLight,
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    flex: 1,
    lineHeight: 18,
  },
  overallBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.base,
  },
  overallValue: {
    color: colors.dashboardGlassLight,
    fontSize: 64,
    lineHeight: 78,
    fontFamily: fonts.numeric,
    textAlign: 'center',
  },
  carouselCard: {
    height: 146,
  },
  carouselCardInner: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'stretch',
  },
  metricIconWrap: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: 'rgba(17,17,17,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    color: colors.dashboardOnLightSecondary,
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    letterSpacing: -0.2,
  },
  metricBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  carouselViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  carouselTrack: {
    flexDirection: 'row',
    height: '100%',
  },
  slide: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.xs,
  },
  metricValue: {
    color: colors.dashboardOnLightPrimary,
    fontSize: 20,
    lineHeight: 28,
    fontFamily: fonts.bold,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  metricSubtext: {
    color: colors.dashboardOnLightPrimary,
    fontSize: 60,
    lineHeight: 62,
    fontFamily: fonts.numeric,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  metricFooter: {
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  metricHint: {
    color: colors.dashboardOnLightMuted,
    fontSize: fontSize.xs,
    fontFamily: fonts.semiBold,
    textTransform: 'lowercase',
    letterSpacing: 0.2,
  },
});
