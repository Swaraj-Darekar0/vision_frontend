import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import * as Progress from 'react-native-progress';

import { colors, fonts, fontSize, spacing, radius } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { useVideoUpload, UploadStatus } from '../hooks/useVideoUpload';
import { useSessionStore } from '../store/sessionStore';

type ProcessingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Processing'>;
type ProcessingScreenRouteProp = RouteProp<RootStackParamList, 'Processing'>;

const ProcessingScreen = () => {
  const navigation = useNavigation<ProcessingScreenNavigationProp>();
  const route = useRoute<ProcessingScreenRouteProp>();
  const { videoUri } = route.params;

  const { elapsedSeconds, topicTitle } = useSessionStore();
  const { uploadVideo, status, compPct, upPct, error } = useVideoUpload();

  const [retryCount, setRetryCount] = useState(0);
  const [slowWarning, setSlowWarning] = useState(false);

  useEffect(() => {
    uploadVideo(videoUri, topicTitle, elapsedSeconds);
  }, [retryCount]);

  useEffect(() => {
    if (status === 'done') {
      navigation.replace('Results');
    }
  }, [status]);

  useEffect(() => {
    if (status === 'processing') {
      const t = setTimeout(() => setSlowWarning(true), 15000);
      return () => clearTimeout(t);
    }
    setSlowWarning(false);
  }, [status]);

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(c => c + 1);
    } else {
      // Logic for contacting support
    }
  };

  const getStatusConfig = (status: UploadStatus) => {
    switch (status) {
      case 'compressing':
        return {
          title: "Optimising Video",
          subtitle: "Compressing for fast analysis...",
          progress: compPct / 100,
          showBar: true,
        };
      case 'uploading':
        return {
          title: "Uploading Recording",
          subtitle: `${upPct}% uploaded`,
          progress: upPct / 100,
          showBar: true,
        };
      case 'processing':
        return {
          title: "Analysing Your Session",
          subtitle: "Detecting pose & speech patterns...",
          showLottie: true,
        };
      case 'error':
        return {
          title: "Something went wrong",
          subtitle: error || "Analysis failed. Please try again.",
          showError: true,
        };
      default:
        return {
          title: "Preparing...",
          subtitle: "Wait a moment",
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

        {slowWarning && status === 'processing' && (
          <View style={styles.warningBox}>
            <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.warningText}>
              Waking up the analysis server — this may take a moment.
            </Text>
          </View>
        )}

        {status === 'error' && (
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
            
            <TouchableOpacity 
              onPress={() => navigation.popToTop()} 
              style={styles.cancelButton}
            >
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
