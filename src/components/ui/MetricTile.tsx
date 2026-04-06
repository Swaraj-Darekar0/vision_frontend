import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fonts, fontSize, spacing } from '../../theme';
import { GlassSurface } from './GlassSurface';

interface MetricTileProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  trendIcon?: keyof typeof MaterialIcons.glyphMap;
  trendColor?: string;
  variant?: 'dark' | 'light';
  centeredValue?: boolean;
}

export const MetricTile: React.FC<MetricTileProps> = ({ 
  icon, label, value, trendIcon, trendColor, variant = 'dark', centeredValue = false,
}) => (
  <GlassSurface
    variant={variant}
    grainOpacity={variant === 'light' ? 0.07 : 0.09}
    style={[styles.card, variant === 'light' ? styles.cardLight : null]}
  >
    <View style={styles.header}>
      <MaterialIcons
        name={icon}
        size={20}
        color={variant === 'light' ? colors.dashboardOnLightSecondary : colors.dashboardIconMuted}
      />
      <Text style={[styles.label, variant === 'light' && styles.labelLight]} numberOfLines={2}>
        {label}
      </Text>
    </View>
    <View style={[styles.valueRow, centeredValue && styles.valueRowCentered]}>
      <Text style={[styles.value, variant === 'light' && styles.valueLight, centeredValue && styles.valueCentered]}>
        {value}
      </Text>
      {trendIcon && (
        <MaterialIcons
          name={trendIcon}
          size={20}
          color={trendColor || (variant === 'light' ? colors.dashboardOnLightMuted : colors.textMuted)}
          style={styles.trend}
        />
      )}
    </View>
  </GlassSurface>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 146,
    justifyContent: 'space-between',
    padding: spacing.base,
  },
  cardLight: {
    backgroundColor: colors.dashboardGlassLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  label: {
    color: colors.dashboardTextSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    flex: 1,
    lineHeight: 18,
  },
  labelLight: {
    color: colors.dashboardOnLightSecondary,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.sm,
  },
  valueRowCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
  },
  value: {
    color: colors.dashboardTextPrimary,
    fontSize: 38,
    fontFamily: fonts.numeric,
  },
  valueLight: {
    color: colors.dashboardOnLightPrimary,
  },
  valueCentered: {
    fontSize: 64,
    lineHeight: 78,
    textAlign: 'center',
  },
  trend: {
    marginLeft: spacing.xs,
  },
});
