import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fonts, fontSize, spacing } from '../../theme';

interface SessionListHeaderProps {
  count: number;
  onBack: () => void;
  onSync: () => void;
  isSyncing?: boolean;
}

export const SessionListHeader: React.FC<SessionListHeaderProps> = ({ 
  count, onBack, onSync, isSyncing 
}) => (
  
  <View style={styles.container}>
    
    <TouchableOpacity onPress={onBack} style={styles.backButton}>
      <MaterialIcons name="chevron-left" size={32} color={colors.textPrimary} />
    </TouchableOpacity>
    <View style={styles.titleContainer}>
      <Text style={styles.title}>All Sessions</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    </View>
    <View style={styles.spacer} />
    <TouchableOpacity 
      onPress={onSync} 
      style={styles.syncButton}
      disabled={isSyncing}
    >
      {isSyncing ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <MaterialIcons name="sync" size={24} color={colors.primary} />
      )}
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  backButton: {
    padding: spacing.xs,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
  },
  badge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
  },
  spacer: {
    flex: 1,
  },
  syncButton: {
    padding: spacing.sm,
  },
});
