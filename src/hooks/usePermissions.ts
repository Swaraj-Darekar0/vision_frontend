import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Alert, Linking } from 'react-native';

export function usePermissions() {
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();

  const allGranted = camPerm?.granted === true && micPerm?.granted === true;

  const requestAll = async (): Promise<boolean> => {
    const cam = await requestCam();
    const mic = await requestMic();
    if (!cam.granted || !mic.granted) {
      Alert.alert(
        'Permissions Required',
        'SpeakingCoach needs camera and microphone access. Enable both in Settings.',
        [
          { text: 'Not Now',      style: 'cancel' },
          { text: 'Open Settings',onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }
    return true;
  };

  return { allGranted, requestAll };
}
