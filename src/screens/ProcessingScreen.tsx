import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import * as Progress from 'react-native-progress';

import { colors, fonts, fontSize, spacing, radius } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { useSessionUpload, UploadStatus } from '../hooks/useSessionUpload';
import { useSessionStore } from '../store/sessionStore';
import { saveDebugPosePayload } from '../utils/saveDebugPosePayload';

type ProcessingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Processing'>;
type ProcessingScreenRouteProp = RouteProp<RootStackParamList, 'Processing'>;

const ProcessingScreen = () => {
  const navigation = useNavigation<ProcessingScreenNavigationProp>();
  const route = useRoute<ProcessingScreenRouteProp>();
  const { landmarkPayload, audioUri, localVideoUri } = route.params;

  const { topicTitle } = useSessionStore();
  const { uploadSession, status, upPct, error } = useSessionUpload();

  const [retryCount, setRetryCount] = useState(0);
  const [slowWarning, setSlowWarning] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setProcessingError(null);
        console.log('[Processing] Starting upload flow', {
          totalFrames: landmarkPayload.total_frames,
          fpsAchieved: landmarkPayload.fps_achieved,
          durationSeconds: landmarkPayload.duration_seconds,
          retryCount,
        });

        if (landmarkPayload.total_frames === 0) {
          throw new Error('No pose data was captured while recording.');
        }

        const debugPath = await saveDebugPosePayload(landmarkPayload);
        if (debugPath) {
          console.log('[PoseCapture] Saved latest raw payload to:', debugPath);
        }

        await uploadSession(landmarkPayload, audioUri, topicTitle, localVideoUri);
      } catch (err: any) {
        if (cancelled) return;
        console.error('[Processing] Run failed', err);
        setProcessingError(err?.message ?? 'Processing failed.');
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [audioUri, landmarkPayload, localVideoUri, retryCount, topicTitle, uploadSession]);

  useEffect(() => {
    if (status === 'done') {
      navigation.replace('Results');
    }
  }, [navigation, status]);

  useEffect(() => {
    if (status === 'processing' || status === 'uploading') {
      const timeout = setTimeout(() => setSlowWarning(true), 15000);
      return () => clearTimeout(timeout);
    }

    setSlowWarning(false);
  }, [status]);

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount((count) => count + 1);
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

    switch (currentStatus) {
      case 'uploading':
        return {
          title: 'Uploading Session',
          subtitle: `${upPct}% uploaded`,
          progress: upPct / 100,
          showBar: true,
        };
      case 'processing':
        return {
          title: 'Analysing Your Session',
          subtitle: 'Analysing pose & speech patterns...',
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
          title: 'Preparing Upload',
          subtitle: 'Finalizing your recording data',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <SafeAreaView style={styles.container}>
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
          <MaterialIcons name="cloud-upload" size={80} color={colors.primary} style={styles.icon} />
        )}

        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>{config.subtitle}</Text>

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

        {slowWarning && (status === 'processing' || status === 'uploading') && (
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
    backgroundColor: colors.backgroundDark,
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
