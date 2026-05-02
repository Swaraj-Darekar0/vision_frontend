import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../theme';

export function useAdaptiveLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const isNarrow = width < 380;
    const isShort = height < 760;
    const isVeryShort = height < 700;

    return {
      width,
      height,
      insets,
      isNarrow,
      isShort,
      isVeryShort,
      horizontalPadding: isNarrow ? spacing.md : spacing.base,
      cardPadding: isNarrow ? spacing.lg : spacing.xl,
      topSpacing: Math.max(insets.top, spacing.sm) + (isShort ? spacing.xs : spacing.md),
      bottomSpacing: Math.max(insets.bottom, spacing.base) + (isShort ? spacing.sm : spacing.lg),
      heroTopSpacing: Math.max(spacing.lg, Math.min(spacing['3xl'], Math.round(height * 0.06))),
      sectionGap: isVeryShort ? spacing.md : isShort ? spacing.lg : spacing.xl,
    };
  }, [height, insets, width]);
}
