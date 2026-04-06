import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Alert, SafeAreaView, TouchableOpacity, Text, Platform } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { useNavigation, useRoute, RouteProp, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, fontSize, spacing } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { useMLKitPoseRecording } from '../hooks/useMLKitPoseRecording';
import { usePermissions } from '../hooks/usePermissions';
import { useSessionStore } from '../store/sessionStore';

import { RecordingHeader } from '../components/recording/RecordingHeader';
import { RecordingControls } from '../components/recording/RecordingControls';
import { DurationTimer } from '../components/recording/DurationTimer';
import { AudioWaveform } from '../components/ui/AudioWaveform';
import { GuideDashedBox } from '../components/recording/GuideDashedBox';

type RecordingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Recording'>;
type RecordingScreenRouteProp = RouteProp<RootStackParamList, 'Recording'>;

const RecordingScreen = () => {
  const navigation = useNavigation<RecordingScreenNavigationProp>();
  const route = useRoute<RecordingScreenRouteProp>();
  const isFocused = useIsFocused();
  const {
    topicTitle,
    minDurationSeconds = 60,
    isDiagnostic = false,
    planDay,
    planSession,
    targetSkill,
    isRecovery,
    weekNumber,
  } = route.params;
  const autoStopTriggeredRef = useRef(false);
  const isTimedPlanSession = useMemo(
    () =>
      !isDiagnostic &&
      typeof planDay === 'number' &&
      typeof planSession === 'number' &&
      minDurationSeconds > 0,
    [isDiagnostic, minDurationSeconds, planDay, planSession],
  );

  const { allGranted, requestAll } = usePermissions();
  const {
    cameraRef,
    device,
    frameProcessor,
    state,
    elapsedSeconds,
    isModelReady,
    framingReady,
    framingMessage,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useMLKitPoseRecording();

  const { setRecordingMeta } = useSessionStore();

  useEffect(() => {
    if (!allGranted) {
      requestAll().then((granted) => {
        if (!granted) navigation.goBack();
      });
    }
  }, [allGranted, navigation, requestAll]);

  useEffect(() => {
    if (state === 'idle') {
      autoStopTriggeredRef.current = false;
    }
  }, [state]);

  const doStop = async () => {
    const { landmarkPayload, audioUri, localVideoUri } = await stopRecording();

    if (landmarkPayload.total_frames === 0) {
      Alert.alert(
        'Recording Issue',
        'No pose data was captured while recording. Please try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!audioUri) {
      Alert.alert(
        'Recording Issue',
        'No audio data was captured. Please try recording again.',
        [{ text: 'OK' }]
      );
      return;
    }

    setRecordingMeta(landmarkPayload.duration_seconds, topicTitle, {
      isDiagnostic,
      planDay,
      planSession,
      targetSkill,
      weekNumber,
    });
    navigation.replace('Processing', {
      capture: {
        landmarkPayload,
        recordedMediaUri: audioUri,
        localVideoUri,
      },
      isDiagnostic,
      planDay,
      planSession,
      targetSkill,
      isRecovery,
      weekNumber,
    });
  };

  const handleStop = async () => {
    if (elapsedSeconds < minDurationSeconds) {
      Alert.alert(
        'Recording Too Short',
        `This topic requires at least ${Math.ceil(minDurationSeconds / 60)} minute(s). Stop anyway?`,
        [
          { text: 'Keep Recording', style: 'cancel' },
          { text: 'Stop Anyway', style: 'destructive', onPress: () => void doStop() },
        ]
      );
      return;
    }
    await doStop();
  };

  const handleStart = () => {
    if (!isModelReady) {
      const message =
        Platform.OS === 'android'
          ? 'The native pose detector is not ready yet. Rebuild the Android app and try again.'
          : 'Real-time pose capture is currently available on Android only.';
      Alert.alert('Initializing', message);
      return;
    }

    void startRecording();
  };

  useEffect(() => {
    if (!isTimedPlanSession) {
      return;
    }

    if (state !== 'recording') {
      return;
    }

    if (elapsedSeconds < minDurationSeconds) {
      return;
    }

    if (autoStopTriggeredRef.current) {
      return;
    }

    autoStopTriggeredRef.current = true;
    void doStop();
  }, [doStop, elapsedSeconds, isTimedPlanSession, minDurationSeconds, state]);

  if (!allGranted || !device) return null;

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused}
        video
        audio
        frameProcessor={frameProcessor}
        onError={(error) => console.error('[RecordingScreen][Camera]', error)}
      />

      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.topGradient} />
      <LinearGradient colors={['transparent', colors.gradientBottom]} style={styles.bottomGradient} />

      <RecordingHeader onBack={() => navigation.goBack()} isRecording={state === 'recording'} />
      <GuideDashedBox />

      <SafeAreaView style={styles.overlay}>
        <View style={styles.spacer} />

        {state === 'idle' ? (
          <View style={styles.idleContainer}>
            {!isModelReady && (
              <Text style={styles.loadingText}>
                {Platform.OS === 'android'
                  ? 'Preparing native pose capture...'
                  : 'Real-time pose capture is Android-only in this build.'}
              </Text>
            )}
            <Text style={styles.topicLabel}>TOPIC</Text>
            <Text style={styles.topicTitle}>{topicTitle}</Text>
            <View
              style={[
                styles.framingBanner,
                framingReady ? styles.framingBannerReady : styles.framingBannerWarning,
              ]}
            >
              <Text style={styles.framingBannerText}>{framingMessage}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.startButton,
                framingReady && styles.startButtonReady,
                !isModelReady && { opacity: 0.5 },
              ]}
              onPress={handleStart}
              disabled={!isModelReady}
            >
              <View style={styles.startButtonInner} />
            </TouchableOpacity>
            <Text style={[styles.startHint, framingReady && styles.startHintReady]}>
              {framingReady ? 'Ready to record' : 'Adjust and then start'}
            </Text>
          </View>
        ) : (
          <View style={styles.activeContainer}>
            <DurationTimer
              seconds={elapsedSeconds}
              targetSeconds={isTimedPlanSession ? minDurationSeconds : undefined}
            />
            <View
              style={[
                styles.framingBanner,
                framingReady ? styles.framingBannerReady : styles.framingBannerWarning,
                styles.activeFramingBanner,
              ]}
            >
              <Text style={styles.framingBannerText}>
                {framingReady ? 'Live pose capture active.' : `Framing warning: ${framingMessage}`}
              </Text>
            </View>
            <AudioWaveform />
            <View style={styles.controlsSpacer} />
            <RecordingControls
              state={state}
              onStop={() => void handleStop()}
              onPause={pauseRecording}
              onResume={resumeRecording}
              onFlip={() => {}}
              hideStopButton={isTimedPlanSession}
            />
            {isTimedPlanSession && (
              <Text style={styles.autoStopHint}>
                This session will end automatically when the assigned duration is complete.
              </Text>
            )}
          </View>
        )}
      </SafeAreaView>

      {state === 'paused' && (
        <View style={styles.pausedOverlay}>
          <Text style={styles.pausedText}>PAUSED</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  overlay: {
    flex: 1,
    zIndex: 5,
  },
  spacer: {
    flex: 1,
  },
  idleContainer: {
    alignItems: 'center',
    paddingBottom: spacing['4xl'],
  },
  topicLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    letterSpacing: 1.5,
  },
  topicTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  startButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  startButtonReady: {
    borderColor: '#34D399',
    shadowColor: '#34D399',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  startButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.recordingRed,
  },
  startHint: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
  },
  startHintReady: {
    color: '#86EFAC',
  },
  framingBanner: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    maxWidth: '84%',
  },
  framingBannerReady: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.55)',
  },
  framingBannerWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.55)',
  },
  framingBannerText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  activeFramingBanner: {
    marginBottom: spacing.md,
  },
  activeContainer: {
    alignItems: 'center',
  },
  controlsSpacer: {
    height: spacing.xl,
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  pausedText: {
    color: colors.textPrimary,
    fontSize: fontSize['4xl'],
    fontFamily: fonts.extraBold,
    letterSpacing: 4,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    marginBottom: spacing.md,
  },
  autoStopHint: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
});

export default RecordingScreen;
