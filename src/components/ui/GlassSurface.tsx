import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius } from '../../theme';
import { DashboardGrainOverlay } from './DashboardGrainOverlay';

interface GlassSurfaceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'dark' | 'light';
  grainOpacity?: number;
}

export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  children,
  style,
  variant = 'dark',
  grainOpacity,
}) => {
  const isLight = variant === 'light';

  return (
    <View
      style={[
        styles.base,
        isLight ? styles.lightSurface : styles.darkSurface,
        style,
      ]}
    >
      <DashboardGrainOverlay opacity={grainOpacity ?? (isLight ? 0.07 : 0.08)} />
      <View style={[styles.topHighlight, isLight ? styles.topHighlightLight : styles.topHighlightDark]} />
      <View style={[styles.leftSheen, isLight ? styles.sideSheenLight : styles.sideSheenDark]} />
      <View style={[styles.rightSheen, isLight ? styles.sideSheenLight : styles.sideSheenDark]} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
  darkSurface: {
    backgroundColor: colors.dashboardGlassDark,
    borderColor: colors.dashboardBorderSoft,
  },
  lightSurface: {
    backgroundColor: colors.dashboardGlassLight,
    borderColor: 'rgba(255,255,255,0.38)',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
  },
  topHighlightDark: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  topHighlightLight: {
    backgroundColor: 'rgba(255,255,255,0.48)',
  },
  leftSheen: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 1,
  },
  rightSheen: {
    position: 'absolute',
    right: 0,
    top: 14,
    bottom: 14,
    width: 1,
  },
  sideSheenDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sideSheenLight: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
});
