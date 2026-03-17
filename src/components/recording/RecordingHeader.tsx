import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fonts, fontSize, spacing, radius } from '../../theme';

interface RecordingHeaderProps {
  onBack: () => void;
  isRecording: boolean;
}

export const RecordingHeader: React.FC<RecordingHeaderProps> = ({ onBack, isRecording }) => (
  <View style={styles.container}>
    <TouchableOpacity onPress={onBack} style={styles.backButton}>
      <MaterialIcons name="chevron-left" size={32} color={colors.textPrimary} />
    </TouchableOpacity>
    {isRecording && (
      <View style={styles.pill}>
        <View style={styles.dot} />
        <Text style={styles.pillText}>REC</Text>
      </View>
    )}
    <View style={styles.spacer} />
    <TouchableOpacity style={styles.iconButton}>
      <MaterialIcons name="settings" size={24} color={colors.textPrimary} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    padding: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.recordingRedBg,
    borderColor: colors.recordingRedBorder,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginLeft: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.recordingRed,
    marginRight: spacing.xs,
  },
  pillText: {
    color: colors.recordingRed,
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
  },
  spacer: {
    flex: 1,
  },
  iconButton: {
    padding: spacing.sm,
    backgroundColor: colors.frostedGlass,
    borderRadius: radius.full,
  },
});
