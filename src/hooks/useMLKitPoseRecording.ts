import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Camera, runAtTargetFps, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from '../store/authStore';
import { LandmarkFrame, LandmarkPoint, PoseLandmarkPayload } from '../types/pose';
import { NativePoseDetectionResult, useMLKitPosePlugin } from '../native/mlKitPosePlugin';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

interface FramingStatus {
  isReady: boolean;
  message: string;
}

const IDLE_FRAME_CHECK_FPS = 2;
const RECORDING_FRAME_CAPTURE_FPS = 10;
const VISIBILITY_THRESHOLD = 0.2;
const VIDEO_RECORDINGS_DIR = `${FileSystem.documentDirectory}recordings/`;

function getEmptyLandmarks(): LandmarkPoint[] {
  return Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 0,
  }));
}

function getFramingStatus(result: NativePoseDetectionResult): FramingStatus {
  if (!result.poseDetected) {
    return {
      isReady: false,
      message: 'Step back until your head, shoulders, and hips are visible.',
    };
  }

  const [nose, , leftEye, , , rightEye, , , , , , leftShoulder, rightShoulder, , , , , , , , , , , leftHip, rightHip, leftKnee, rightKnee] =
    result.landmarks;

  const headVisible =
    (nose?.visibility ?? 0) >= VISIBILITY_THRESHOLD ||
    (leftEye?.visibility ?? 0) >= VISIBILITY_THRESHOLD ||
    (rightEye?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const shouldersVisible =
    (leftShoulder?.visibility ?? 0) >= VISIBILITY_THRESHOLD &&
    (rightShoulder?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const hipsVisible =
    (leftHip?.visibility ?? 0) >= VISIBILITY_THRESHOLD ||
    (rightHip?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const kneesVisible =
    (leftKnee?.visibility ?? 0) >= VISIBILITY_THRESHOLD ||
    (rightKnee?.visibility ?? 0) >= VISIBILITY_THRESHOLD;

  if (!headVisible || !shouldersVisible || !(hipsVisible || kneesVisible)) {
    return {
      isReady: false,
      message: 'Keep your head, shoulders, and hips in frame.',
    };
  }

  const shoulderMidX = ((leftShoulder?.x ?? 0.5) + (rightShoulder?.x ?? 0.5)) / 2;
  if (shoulderMidX < 0.22 || shoulderMidX > 0.78) {
    return {
      isReady: false,
      message: 'Center your body in the guide box before you start.',
    };
  }

  return {
    isReady: true,
    message: 'Ready to record',
  };
}

export function useMLKitPoseRecording() {
  const { user } = useAuthStore();
  const device = useCameraDevice('front');
  const cameraRef = useRef<Camera | null>(null);
  const landmarkFramesRef = useRef<LandmarkFrame[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const isRecordingRef = useRef(false);
  const isStartingRecordingRef = useRef(false);
  const videoRecordingPromiseRef = useRef<Promise<string | null> | null>(null);
  const resolveVideoRecordingRef = useRef<((uri: string | null) => void) | null>(null);
  const rejectVideoRecordingRef = useRef<((error: Error) => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const posePlugin = useMLKitPosePlugin();

  const [state, setState] = useState<RecordingState>('idle');
  const [elapsedSeconds, setElapsed] = useState(0);
  const [framingReady, setFramingReady] = useState(false);
  const [framingMessage, setFramingMessage] = useState('Position yourself in the guide box.');

  const isPoseCaptureAvailable = Platform.OS === 'android' && posePlugin != null;

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const receivePoseFrame = useCallback(
    (result: NativePoseDetectionResult) => {
      const nextFramingStatus = getFramingStatus(result);
      setFramingReady(nextFramingStatus.isReady);
      setFramingMessage(nextFramingStatus.message);

      if (!isRecordingRef.current) {
        return;
      }

      landmarkFramesRef.current.push({
        timestamp: (Date.now() - recordingStartTimeRef.current) / 1000,
        landmarks:
          result.landmarks.length === 33 ? result.landmarks : getEmptyLandmarks(),
      });
    },
    []
  );

  const onPoseFrame = useRunOnJS(receivePoseFrame, [receivePoseFrame]);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';

      if (posePlugin == null) {
        return;
      }

      const targetFps = state === 'recording' ? RECORDING_FRAME_CAPTURE_FPS : IDLE_FRAME_CHECK_FPS;
      runAtTargetFps(targetFps, () => {
        const result = posePlugin.scan(frame);
        if (result == null) {
          return;
        }
        void onPoseFrame(result);
      });
    },
    [onPoseFrame, posePlugin, state]
  );

  const persistVideoFile = useCallback(async (rawPath: string): Promise<string> => {
    const sourceUri = rawPath.startsWith('file://') ? rawPath : `file://${rawPath}`;
    await FileSystem.makeDirectoryAsync(VIDEO_RECORDINGS_DIR, { intermediates: true });

    const extension = sourceUri.split('.').pop() || 'mp4';
    const targetUri = `${VIDEO_RECORDINGS_DIR}${uuidv4()}.${extension}`;
    await FileSystem.copyAsync({ from: sourceUri, to: targetUri });
    return targetUri;
  }, []);

  const startVideoRecording = useCallback(async () => {
    if (!cameraRef.current) {
      throw new Error('Camera is not ready yet.');
    }

    videoRecordingPromiseRef.current = new Promise<string | null>((resolve, reject) => {
      resolveVideoRecordingRef.current = resolve;
      rejectVideoRecordingRef.current = reject;
    });

    cameraRef.current.startRecording({
      fileType: 'mp4',
      onRecordingFinished: (video) => {
        void persistVideoFile(video.path)
          .then((uri) => resolveVideoRecordingRef.current?.(uri))
          .catch((error) => rejectVideoRecordingRef.current?.(error as Error))
          .finally(() => {
            resolveVideoRecordingRef.current = null;
            rejectVideoRecordingRef.current = null;
          });
      },
      onRecordingError: (error) => {
        rejectVideoRecordingRef.current?.(new Error(error.message));
        resolveVideoRecordingRef.current = null;
        rejectVideoRecordingRef.current = null;
      },
    });
  }, [persistVideoFile]);

  const startRecording = useCallback(async () => {
    if (!isPoseCaptureAvailable) {
      throw new Error('Real-time pose capture is only available on Android after rebuilding the app.');
    }

    if (isRecordingRef.current || isStartingRecordingRef.current) {
      return;
    }

    isStartingRecordingRef.current = true;
    try {
      landmarkFramesRef.current = [];
      recordingStartTimeRef.current = Date.now();
      isRecordingRef.current = true;
      setElapsed(0);
      setState('recording');
      startTimer();
      await startVideoRecording();
    } finally {
      isStartingRecordingRef.current = false;
    }
  }, [isPoseCaptureAvailable, startVideoRecording]);

  const stopRecording = useCallback(async (): Promise<{
    landmarkPayload: PoseLandmarkPayload;
    audioUri: string | null;
    localVideoUri: string | null;
  }> => {
    stopTimer();
    isRecordingRef.current = false;
    setState('idle');

    try {
      if (cameraRef.current) {
        await cameraRef.current.stopRecording();
      }
    } catch (error) {
      console.error('[Recording] Failed to stop video recording', error);
    }

    let localVideoUri: string | null = null;
    try {
      localVideoUri = videoRecordingPromiseRef.current
        ? await videoRecordingPromiseRef.current
        : null;
    } catch (error) {
      console.error('[Recording] Video recording failed', error);
    } finally {
      videoRecordingPromiseRef.current = null;
      resolveVideoRecordingRef.current = null;
      rejectVideoRecordingRef.current = null;
    }

    const durationSeconds = elapsedSeconds;
    const frames = [...landmarkFramesRef.current];
    const safeDuration = durationSeconds > 0 ? durationSeconds : Math.max(frames.length / RECORDING_FRAME_CAPTURE_FPS, 1);

    return {
      landmarkPayload: {
        session_id: uuidv4(),
        user_id: user?.id ?? '',
        fps_achieved: Number((frames.length / safeDuration).toFixed(2)),
        total_frames: frames.length,
        duration_seconds: safeDuration,
        frames,
      },
      audioUri: localVideoUri,
      localVideoUri,
    };
  }, [elapsedSeconds, user?.id]);

  const pauseRecording = useCallback(() => {
    stopTimer();
    isRecordingRef.current = false;
    setState('paused');
  }, []);

  const resumeRecording = useCallback(() => {
    isRecordingRef.current = true;
    setState('recording');
    startTimer();
  }, []);

  return {
    cameraRef,
    device,
    frameProcessor: isPoseCaptureAvailable ? frameProcessor : undefined,
    state,
    elapsedSeconds,
    isModelReady: isPoseCaptureAvailable,
    framingReady,
    framingMessage,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}
