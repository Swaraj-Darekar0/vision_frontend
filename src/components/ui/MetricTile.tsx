import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fonts, fontSize, spacing } from '../../theme';
import { Card } from './Card';

interface MetricTileProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  trendIcon?: keyof typeof MaterialIcons.glyphMap;
  trendColor?: string;
}

export const MetricTile: React.FC<MetricTileProps> = ({ 
  icon, label, value, trendIcon, trendColor 
}) => (
  <Card style={styles.card}>
    <View style={styles.header}>
      <MaterialIcons name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
    </View>
    <View style={styles.valueRow}>
      <Text style={styles.value}>{value}</Text>
      {trendIcon && (
        <MaterialIcons name={trendIcon} size={20} color={trendColor || colors.textMuted} style={styles.trend} />
      )}
    </View>
  </Card>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 110, // Slightly increased to accommodate potential two-line labels
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Changed to flex-start for better multi-line alignment
    gap: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    flex: 1, // Allow text to take remaining space and wrap
    lineHeight: 18,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.sm,
  },
  value: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
  },
  trend: {
    marginLeft: spacing.xs,
  },
});
