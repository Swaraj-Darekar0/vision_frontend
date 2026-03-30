import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';
import { RecordingState } from '../../hooks/useMLKitPoseRecording';

interface RecordingControlsProps {
  state: RecordingState;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onFlip: () => void;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  state,
  onStop,
  onPause,
  onResume,
  onFlip,
}) => (
  <View style={styles.container}>
    <TouchableOpacity onPress={onFlip} style={styles.secondaryButton}>
      <MaterialIcons name="flip-camera-ios" size={28} color={colors.textPrimary} />
    </TouchableOpacity>

    <TouchableOpacity onPress={onStop} style={styles.stopButton} activeOpacity={0.8}>
      <View style={styles.stopInner} />
    </TouchableOpacity>

    {state === 'recording' ? (
      <TouchableOpacity onPress={onPause} style={styles.secondaryButton}>
        <MaterialIcons name="pause" size={28} color={colors.textPrimary} />
      </TouchableOpacity>
    ) : (
      <TouchableOpacity onPress={onResume} style={styles.secondaryButton}>
        <MaterialIcons name="play-arrow" size={28} color={colors.textPrimary} />
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingBottom: spacing.xl,
  },
  secondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.frostedGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopInner: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: colors.recordingRed,
  },
});
