import { Camera } from 'react-native-vision-camera';
import { Alert, Linking } from 'react-native';
import { useState, useEffect } from 'react';

export function usePermissions() {
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(false);

  const checkPermissions = async () => {
    const camStatus = Camera.getCameraPermissionStatus();
    const micStatus = Camera.getMicrophonePermissionStatus();
    setHasCameraPermission(camStatus === 'granted');
    setHasMicrophonePermission(micStatus === 'granted');
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  const allGranted = hasCameraPermission && hasMicrophonePermission;

  const requestAll = async (): Promise<boolean> => {
    const camStatus = await Camera.requestCameraPermission();
    const micStatus = await Camera.requestMicrophonePermission();

    const camGranted = camStatus === 'granted';
    const micGranted = micStatus === 'granted';

    setHasCameraPermission(camGranted);
    setHasMicrophonePermission(micGranted);

    if (!camGranted || !micGranted) {
      Alert.alert(
        'Permissions Required',
        'SpeakingCoach needs camera and microphone access. Enable both in Settings.',
        [
          { text: 'Not Now',      style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }
    return true;
  };

  return { allGranted, requestAll };
}
