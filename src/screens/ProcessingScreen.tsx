import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import * as Progress from 'react-native-progress';

import { colors, fonts, fontSize, radius, spacing } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { useSessionUpload, UploadStatus } from '../hooks/useSessionUpload';
import { useSessionStore } from '../store/sessionStore';
import { saveDebugPosePayload } from '../utils/saveDebugPosePayload';
import { AcousticAnalysisProgressStage, LocalAnalysisStage } from '../pipeline/types';
import { prepareSessionAnalysisBundle } from '../pipeline/prepareSessionAnalysisBundle';

type ProcessingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Processing'>;
type ProcessingScreenRouteProp = RouteProp<RootStackParamList, 'Processing'>;

const ProcessingScreen = () => {
  const navigation = useNavigation<ProcessingScreenNavigationProp>();
  const route = useRoute<ProcessingScreenRouteProp>();
  const {
    capture,
    isDiagnostic,
    planDay,
    planSession,
    targetSkill,
    isRecovery,
    weekNumber,
  } = route.params;

  const { topicTitle } = useSessionStore();
  const { uploadSession, status, upPct, error } = useSessionUpload();

  const [retryCount, setRetryCount] = useState(0);
  const [slowWarning, setSlowWarning] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [localStage, setLocalStage] = useState<LocalAnalysisStage | null>(null);
  const [acousticDetail, setAcousticDetail] = useState<AcousticAnalysisProgressStage | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setProcessingError(null);
        setLocalStage('preparing');
        console.log('[Processing] Starting upload flow', {
          totalFrames: capture.landmarkPayload.total_frames,
          fpsAchieved: capture.landmarkPayload.fps_achieved,
          durationSeconds: capture.landmarkPayload.duration_seconds,
          retryCount,
        });

        if (capture.landmarkPayload.total_frames === 0) {
          throw new Error('No pose data was captured while recording.');
        }

        const debugPath = await saveDebugPosePayload(capture.landmarkPayload);
        if (debugPath) {
          console.log('[PoseCapture] Saved latest raw payload to:', debugPath);
        }

        const bundle = await prepareSessionAnalysisBundle(capture, (stage, detail) => {
          if (!cancelled) {
            setLocalStage(stage);
            setAcousticDetail(stage === 'acoustic' ? detail ?? null : null);
          }
        });

        if (cancelled) return;

        setLocalStage(null);
        setAcousticDetail(null);

        const outcome = await uploadSession(bundle, topicTitle, capture.localVideoUri, {
          isDiagnostic,
          planDay,
          planSession,
          targetSkill,
          isRecovery,
          weekNumber,
        });

        if (cancelled) return;

        if (outcome === 'queued') {
          Alert.alert(
            'Session Queued',
            'This session finished local analysis and is queued safely. It will upload automatically when you are back online.',
            [{ text: 'OK', onPress: () => navigation.popToTop() }],
          );
        }
      } catch (err: any) {
        if (cancelled) return;
        console.error('[Processing] Run failed', err);
        setProcessingError(err?.message ?? 'Processing failed.');
        setLocalStage(null);
        setAcousticDetail(null);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    capture,
    isDiagnostic,
    isRecovery,
    navigation,
    planDay,
    planSession,
    retryCount,
    targetSkill,
    topicTitle,
    uploadSession,
    weekNumber,
  ]);

  useEffect(() => {
    if (status === 'done') {
      navigation.replace(isDiagnostic ? 'PostAssessment' : 'Results');
    }
  }, [isDiagnostic, navigation, status]);

  useEffect(() => {
    if (localStage || status === 'processing' || status === 'uploading') {
      const timeout = setTimeout(() => setSlowWarning(true), 15000);
      return () => clearTimeout(timeout);
    }

    setSlowWarning(false);
  }, [localStage, status]);

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount((count) => count + 1);
    }
  };

  const getAcousticSubtitle = () => {
    switch (acousticDetail) {
      case 'decoding_audio':
        return 'Decoding the m4a speech track on device and preparing frontend extraction.';
      case 'analyzing_chunks':
        return 'Computing pitch and loudness metrics in TypeScript before upload.';
      case 'building_windows':
        return 'Building backend-compatible 5-second acoustic windows.';
      case 'finalizing_metrics':
        return 'Finalizing rounded acoustic metrics and packaging audio_acoustic_json.';
      default:
        return 'Computing frontend acoustic metrics on device before upload.';
    }
  };

  const getStatusConfig = (currentStatus: UploadStatus) => {
    if (processingError) {
      return {
        title: 'Something went wrong',
        subtitle: processingError,
        showError: true,
      };
    }

    if (localStage === 'preparing') {
      return {
        title: 'Preparing Session',
        subtitle: 'Optimizing your recording on device before anything is uploaded.',
        progress: 0.16,
        showBar: true,
      };
    }

    if (localStage === 'pose') {
      return {
        title: 'Analyzing Body Language On Device',
        subtitle: 'Turning raw landmarks into compact posture metrics for a lighter request.',
        progress: 0.4,
        showBar: true,
      };
    }

    if (localStage === 'audio_preprocessing') {
      return {
        title: 'Preparing Audio For Upload',
        subtitle: 'Preparing a lighter upload while keeping transcript and final coaching on the server.',
        progress: 0.58,
        showBar: true,
      };
    }

    if (localStage === 'acoustic') {
      return {
        title: 'Extracting Vocal Metrics',
        subtitle: getAcousticSubtitle(),
        progress: 0.72,
        showBar: true,
      };
    }

    switch (currentStatus) {
      case 'uploading':
        const normalizedUploadProgress = upPct > 0 ? upPct / 100 : 0.08;
        return {
          title: 'Uploading Analysis Package',
          subtitle:
            upPct > 0
              ? `${upPct}% uploaded`
              : 'Sending your prepared audio and analysis files to the backend.',
          progress: normalizedUploadProgress,
          showBar: true,
        };
      case 'processing':
        return {
          title: 'keep calm, we are processing your session',
          subtitle: 'This may take a few moments. We will notify you when it is ready.',
          showLottie: true,
        };
      case 'error':
        return {
          title: 'Something went wrong',
          subtitle: error || 'Analysis failed. Please try again.',
          showError: true,
        };
      default:
        return {
          title: 'Preparing Session',
          subtitle: 'Finalizing your recording data.',
          progress: 0.08,
          showBar: true,
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <SafeAreaView style={styles.container}>
      {/* <View style={styles.topWarningBadge}>
        <MaterialIcons name="warning-amber" size={18} color={colors.textPrimary} />
        <Text style={styles.topWarningBadgeText}>
          do not close the app ,or this process would be killed
        </Text>
      </View> */}

      <View style={styles.content}>
        {config.showLottie && (
          <LottieView
            source={require('../../assets/animations/loading.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
        )}

        {config.showError ? (
          <MaterialIcons name="error-outline" size={80} color={colors.negative} style={styles.icon} />
        ) : !config.showLottie && (
          <MaterialIcons
            name={localStage ? 'memory' : 'cloud-upload'}
            size={80}
            color={colors.primary}
            style={styles.icon}
          />
        )}

        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>{config.subtitle}</Text>

        {!config.showError && (
          <View style={styles.backgroundNoteBox}>
            <Text style={styles.backgroundNoteText}>
              you can move on to you other task ,just don't close the app , this process shall continue in
              the background, we will notify you when its done .
            </Text>
          </View>
        )}

        {config.showBar && (
          <View style={styles.progressContainer}>
            <Progress.Bar
              progress={config.progress}
              width={240}
              height={8}
              color={colors.primary}
              unfilledColor={colors.surfaceElevated}
              borderWidth={0}
              borderRadius={4}
            />
          </View>
        )}

        {!config.showError && !config.showLottie && (
          <LottieView
            source={require('../../assets/animations/loading.json')}
            autoPlay
            loop
            style={styles.inlineLottie}
          />
        )}

        {slowWarning && (localStage || status === 'processing' || status === 'uploading') && (
          <View style={styles.warningBox}>
            <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.warningText}>
              {status === 'processing'
                ? 'Waking up the analysis server — this may take a moment.'
                : 'Uploading your recording data — this may take a moment.'}
            </Text>
          </View>
        )}

        {(status === 'error' || processingError) && (
          <View style={styles.errorActions}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              disabled={retryCount >= 3}
            >
              <Text style={styles.retryButtonText}>
                {retryCount >= 3 ? 'Contact Support' : 'Try Again'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.popToTop()} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.negative,
    alignSelf: 'center',
  },
  topWarningBadgeText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  lottie: {
    width: 200,
    height: 200,
    marginBottom: spacing.xl,
  },
  icon: {
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  progressContainer: {
    marginTop: spacing.xl,
  },
  inlineLottie: {
    width: 140,
    height: 140,
    marginTop: spacing.lg,
  },
  backgroundNoteBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  backgroundNoteText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceDark,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing['3xl'],
    marginHorizontal: spacing.xl,
  },
  warningText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    flex: 1,
  },
  errorActions: {
    marginTop: spacing['2xl'],
    width: '100%',
    gap: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.medium,
  },
});

export default ProcessingScreen;
