import { useMemo } from 'react';
import { Frame, VisionCameraProxy } from 'react-native-vision-camera';
import { Platform } from 'react-native';
import { LandmarkPoint } from '../types/pose';

export interface NativePoseDetectionResult {
  poseDetected: boolean;
  landmarks: LandmarkPoint[];
}

interface MLKitPosePlugin {
  scan(frame: Frame): NativePoseDetectionResult | undefined;
}

export function createMLKitPosePlugin(): MLKitPosePlugin | null {
  if (Platform.OS !== 'android') {
    return null;
  }

  const plugin = VisionCameraProxy.initFrameProcessorPlugin('mlKitPose', {});
  if (plugin == null) {
    throw new Error(
      'Cannot find the native ML Kit pose plugin. Rebuild the Android app after installing the native changes.'
    );
  }

  return {
    scan(frame: Frame): NativePoseDetectionResult | undefined {
      'worklet';
      return plugin.call(frame) as NativePoseDetectionResult | undefined;
    },
  };
}

export function useMLKitPosePlugin(): MLKitPosePlugin | null {
  return useMemo(() => createMLKitPosePlugin(), []);
}
