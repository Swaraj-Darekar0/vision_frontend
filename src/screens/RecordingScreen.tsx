import React, { useEffect } from 'react';
import { View, StyleSheet, Alert, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import { CameraView } from 'expo-camera';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import NetInfo from '@react-native-community/netinfo';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import { colors, fonts, fontSize, spacing, radius } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { useRecording } from '../hooks/useRecording';
import { usePermissions } from '../hooks/usePermissions';
import { useSessionStore } from '../store/sessionStore';
import { enqueueSession, getQueueCount } from '../cache/offlineQueue';
import { OFFLINE_QUEUE } from '../theme/constants';

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
  const { topicTitle, minDurationSeconds = 60 } = route.params;

  const { allGranted, requestAll } = usePermissions();
  const { 
    cameraRef, state, videoUri, elapsedSeconds, facing,
    startRecording, stopRecording, pauseRecording, resumeRecording, flipCamera 
  } = useRecording();
  
  const { setRecordingMeta } = useSessionStore();

  useEffect(() => {
    if (!allGranted) {
      requestAll().then(granted => {
        if (!granted) navigation.goBack();
      });
    }
  }, [allGranted]);

  useEffect(() => {
    if (state !== 'stopped' || !videoUri) return;

    (async () => {
      const net = await NetInfo.fetch();

      if (net.isConnected) {
        navigation.replace('Processing', { videoUri });
      } else {
        const queueCount = await getQueueCount();

        if (queueCount >= OFFLINE_QUEUE.MAX_SESSIONS) {
          Alert.alert(
            'Queue Full',
            `You have ${OFFLINE_QUEUE.MAX_SESSIONS} sessions waiting to upload. Connect to the internet to analyse them first.`,
            [{ text: 'OK', onPress: () => navigation.replace('Dashboard') }],
          );
          return;
        }

        await enqueueSession({
          id: uuidv4(),
          videoUri,
          topicTitle,
          elapsedSeconds,
          queuedAt: new Date().toISOString(),
        });

        Alert.alert(
          'Saved Offline',
          'Your session has been saved. It will be uploaded automatically when you reconnect to the internet.',
          [{ text: 'OK', onPress: () => navigation.replace('Dashboard') }]
        );
      }
    })();
  }, [state, videoUri]);

  const handleStop = async () => {
    // Check queue limit before stopping
    const queueCount = await getQueueCount();
    const net = await NetInfo.fetch();
    
    if (!net.isConnected && queueCount >= OFFLINE_QUEUE.MAX_SESSIONS) {
      Alert.alert(
        'Queue Full',
        'Cannot save more offline sessions. Please connect to the internet to clear your queue.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (elapsedSeconds < minDurationSeconds) {
      Alert.alert(
        'Recording Too Short',
        `This topic requires at least ${Math.ceil(minDurationSeconds / 60)} minute(s). Stop anyway?`,
        [
          { text: 'Keep Recording', style: 'cancel' },
          { text: 'Stop Anyway', style: 'destructive', onPress: doStop },
        ]
      );
      return;
    }
    doStop();
  };

  const doStop = () => {
    setRecordingMeta(elapsedSeconds, topicTitle);
    stopRecording();
  };

  const handleStart = () => {
    startRecording();
  };

  if (!allGranted) return null;

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
      />

      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={styles.topGradient}
      />

      <LinearGradient
        colors={['transparent', colors.gradientBottom]}
        style={styles.bottomGradient}
      />

      <RecordingHeader 
        onBack={() => navigation.goBack()} 
        isRecording={state === 'recording'} 
      />

      <GuideDashedBox />

      <SafeAreaView style={styles.overlay}>
        <View style={styles.spacer} />
        
        {state === 'idle' ? (
          <View style={styles.idleContainer}>
            <Text style={styles.topicLabel}>TOPIC</Text>
            <Text style={styles.topicTitle}>{topicTitle}</Text>
            <TouchableOpacity 
              style={styles.startButton} 
              onPress={handleStart}
            >
              <View style={styles.startButtonInner} />
            </TouchableOpacity>
            <Text style={styles.startHint}>Tap to start</Text>
          </View>
        ) : (
          <View style={styles.activeContainer}>
            <DurationTimer seconds={elapsedSeconds} />
            <AudioWaveform />
            <View style={styles.controlsSpacer} />
            <RecordingControls 
              state={state}
              onStop={handleStop}
              onPause={pauseRecording}
              onResume={resumeRecording}
              onFlip={flipCamera}
            />
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
});

export default RecordingScreen;
