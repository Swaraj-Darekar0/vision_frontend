import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Alert, SafeAreaView, TouchableOpacity, Text, Platform, Image } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { useNavigation, useRoute, RouteProp, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as Progress from 'react-native-progress';
import LottieView from 'lottie-react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
  const [startCountdown, setStartCountdown] = useState<number | null>(null);
  const [isPreparingProcessing, setIsPreparingProcessing] = useState(false);
  const [showHelperGuide, setShowHelperGuide] = useState(true);
  const isAutoTimedSession = useMemo(() => minDurationSeconds > 0, [minDurationSeconds]);

  const { allGranted, requestAll } = usePermissions();
  const {
    cameraRef,
    cameraPosition,
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
    switchCamera,
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

  useEffect(() => {
    if (startCountdown == null) {
      return;
    }

    if (startCountdown === 0) {
      setStartCountdown(null);
      void startRecording();
      return;
    }

    const timeout = setTimeout(() => {
      setStartCountdown((current) => (current == null ? null : current - 1));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [startCountdown, startRecording]);

  const doStop = useCallback(async () => {
    setIsPreparingProcessing(true);
    const { landmarkPayload, audioUri, localVideoUri } = await stopRecording();

    if (landmarkPayload.total_frames === 0) {
      setIsPreparingProcessing(false);
      Alert.alert(
        'Recording Issue',
        'No pose data was captured while recording. Please try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!audioUri) {
      setIsPreparingProcessing(false);
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
  }, [
    isDiagnostic,
    isRecovery,
    navigation,
    planDay,
    planSession,
    setRecordingMeta,
    stopRecording,
    targetSkill,
    topicTitle,
    weekNumber,
  ]);

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
    if (startCountdown != null || isPreparingProcessing) {
      return;
    }

    if (!isModelReady) {
      const message =
        Platform.OS === 'android'
          ? 'The native pose detector is not ready yet. Rebuild the Android app and try again.'
          : 'Real-time pose capture is currently available on Android only.';
      Alert.alert('Initializing', message);
      return;
    }

    setStartCountdown(5);
  };

  useEffect(() => {
    if (!isAutoTimedSession) {
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
  }, [doStop, elapsedSeconds, isAutoTimedSession, minDurationSeconds, state]);

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
            {isPreparingProcessing ? (
              <View style={styles.processingPreview}>
                <LottieView
                  source={require('../../assets/animations/loading.json')}
                  autoPlay
                  loop
                  style={styles.processingPreviewLottie}
                />
                <MaterialIcons
                  name="memory"
                  size={72}
                  color={colors.primary}
                  style={styles.processingPreviewIcon}
                />
                <Text style={styles.processingPreviewTitle}>Preparing Session</Text>
                <Text style={styles.processingPreviewSubtitle}>
                  Finalizing your recording and getting the analysis package ready.
                </Text>
                <View style={styles.processingPreviewBar}>
                  <Progress.Bar
                    progress={0.2}
                    width={240}
                    height={8}
                    color={colors.primary}
                    unfilledColor={colors.surfaceElevated}
                    borderWidth={0}
                    borderRadius={4}
                  />
                </View>
              </View>
            ) : (
              <>
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
                {startCountdown == null && (
                  <TouchableOpacity
                    style={styles.cameraSwitchButton}
                    onPress={switchCamera}
                    disabled={isPreparingProcessing}
                  >
                    <MaterialIcons name="flip-camera-ios" size={18} color={colors.textPrimary} />
                    <Text style={styles.cameraSwitchText}>
                      Use {cameraPosition === 'front' ? 'rear' : 'front'} camera
                    </Text>
                  </TouchableOpacity>
                )}
                {startCountdown != null ? (
                  <>
                    <View style={styles.countdownRing}>
                      <Text style={styles.countdownValue}>{startCountdown}</Text>
                    </View>
                    <Text style={styles.countdownLabel}>Settle in. Recording starts shortly.</Text>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </>
            )}
          </View>
        ) : (
          <View style={styles.activeContainer}>
            <DurationTimer
              seconds={elapsedSeconds}
              targetSeconds={isAutoTimedSession ? minDurationSeconds : undefined}
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
              hideStopButton={isAutoTimedSession}
            />
            {isAutoTimedSession && (
              <Text style={styles.autoStopHint}>
                This session will end automatically when the assigned duration is complete.
              </Text>
            )}
          </View>
        )}
      </SafeAreaView>

      {state === 'paused' && (
        <View pointerEvents="none" style={styles.pausedOverlay}>
          <Text style={styles.pausedText}>PAUSED</Text>
        </View>
      )}

      {state === 'idle' && showHelperGuide && !isPreparingProcessing && (
        <View style={styles.helperOverlay}>
          <View style={styles.helperModal}>
            <TouchableOpacity
              style={styles.helperCloseButton}
              onPress={() => setShowHelperGuide(false)}
              hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
            >
              <MaterialIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Image
              source={require("../../assets/images/do's and don'ts.png")}
              style={styles.helperImage}
              resizeMode="contain"
            />
          </View>
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
  countdownRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    marginBottom: spacing.md,
  },
  countdownValue: {
    color: colors.textPrimary,
    fontSize: fontSize['5xl'],
    fontFamily: fonts.extraBold,
  },
  countdownLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.medium,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  cameraSwitchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.frostedGlass,
    marginBottom: spacing.lg,
  },
  cameraSwitchText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
  },
  processingPreview: {
    alignItems: 'center',
    paddingBottom: spacing['4xl'],
    paddingHorizontal: spacing.xl,
  },
  processingPreviewLottie: {
    width: 150,
    height: 150,
    marginBottom: spacing.lg,
  },
  processingPreviewIcon: {
    marginBottom: spacing.lg,
  },
  processingPreviewTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  processingPreviewSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  processingPreviewBar: {
    marginTop: spacing.xl,
  },
  helperOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  helperModal: {
    width: '50%',
    height: '50%',
    minWidth: 220,
    minHeight: 280,
    backgroundColor: 'rgba(24, 25, 27, 0.8)',
    borderRadius: 1,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  helperCloseButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgb(24, 25, 27)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  helperImage: {
    width: '100%',
    height: '100%',
    borderRadius: 1,
  },
});

export default RecordingScreen;
